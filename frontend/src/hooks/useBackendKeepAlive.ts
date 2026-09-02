'use client';

import { useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-backend.onrender.com';
const PING_INTERVAL_MS = 8 * 60 * 1000; // 8 minutes (safely under Render's 15-min idle limit)
const PRE_SCHEDULE_WAKE_MS = 5 * 60 * 1000; // Wake backend 5 min before a scheduled post

/**
 * useBackendKeepAlive
 *
 * A React hook that:
 *  1. Pings the backend's /api/health endpoint every 8 minutes while
 *     the browser tab is open — preventing Render free-tier spin-down.
 *  2. Accepts an optional list of upcoming scheduled post times and
 *     schedules an extra wake-up ping 5 minutes before each one fires,
 *     ensuring the backend is warm when the post is due.
 *
 * Usage:
 *   // In any component (e.g., layout or ManagePostView):
 *   useBackendKeepAlive(scheduledTimes);
 *
 * @param scheduledTimes - ISO date strings of upcoming scheduled posts
 */
export function useBackendKeepAlive(scheduledTimes: string[] = []) {
  const pingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const ping = useCallback(async (reason = 'periodic') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`[KeepAlive] ✅ Backend alive (${reason}) — uptime: ${data.uptime}s`);
      }
    } catch {
      console.warn(`[KeepAlive] ⚠️  Backend ping failed (${reason})`);
    }
  }, []);

  // Periodic keep-alive ping
  useEffect(() => {
    // Immediate ping on mount so we know the server is reachable
    ping('mount');

    intervalRef.current = setInterval(() => {
      ping('periodic');
    }, PING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ping]);

  // Schedule pre-post wake-up pings for upcoming scheduled posts
  useEffect(() => {
    const now = Date.now();

    // Clear any old timers for posts that no longer exist
    const currentKeys = new Set(scheduledTimes);
    pingTimeouts.current.forEach((timer, key) => {
      if (!currentKeys.has(key)) {
        clearTimeout(timer);
        pingTimeouts.current.delete(key);
      }
    });

    for (const isoTime of scheduledTimes) {
      if (pingTimeouts.current.has(isoTime)) continue; // already scheduled

      const postTime = new Date(isoTime).getTime();
      const wakeTime = postTime - PRE_SCHEDULE_WAKE_MS;
      const delay = wakeTime - now;

      if (delay > 0) {
        const timer = setTimeout(() => {
          ping(`pre-schedule (post at ${isoTime})`);
          pingTimeouts.current.delete(isoTime);
        }, delay);
        pingTimeouts.current.set(isoTime, timer);
        console.log(
          `[KeepAlive] 📅 Scheduled wake-up ping in ${Math.round(delay / 60000)} min for post at ${isoTime}`,
        );
      } else if (postTime > now) {
        // Less than 5 min away — ping immediately
        ping(`imminent-schedule (post at ${isoTime})`);
      }
    }

    return () => {
      pingTimeouts.current.forEach((t) => clearTimeout(t));
      pingTimeouts.current.clear();
    };
  }, [scheduledTimes, ping]);
}
