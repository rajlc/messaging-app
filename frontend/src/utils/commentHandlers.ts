// Comment handler utilities for page.tsx
// Add these functions after the handleQuickReplySend function

export const commentHandlers = {
    // Fetch comments for a customer
    fetchComments: async (customerId: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/customer/${customerId}`
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            return [];
        }
    },

    // Reply to comment publicly
    replyPublic: async (commentId: string, message: string, accessToken: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/${commentId}/reply`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, accessToken })
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to reply to comment:', error);
            throw error;
        }
    },

    //Reply to comment privately  
    replyPrivate: async (commentId: string, message: string, accessToken: string, pageId: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/${commentId}/reply-private`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, accessToken, pageId })
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to send private reply:', error);
            throw error;
        }
    },

    // Hide comment
    hideComment: async (commentId: string, accessToken: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/${commentId}/hide`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken })
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to hide comment:', error);
            throw error;
        }
    },

    // Extract phone number from text
    extractPhone: (text: string): string | null => {
        const phoneRegex = /(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g;
        const matches = text.match(phoneRegex);
        return matches ? matches[0] : null;
    },

    // Extract address hints from text
    extractAddress: (text: string): string | null => {
        // Simple extraction - looks for common address keywords
        const addressKeywords = ['address', 'location', 'deliver to', 'send to', 'ship to'];
        const lowerText = text.toLowerCase();

        for (const keyword of addressKeywords) {
            if (lowerText.includes(keyword)) {
                const index = lowerText.indexOf(keyword);
                // Extract the text after the keyword (next 100 chars)
                return text.substring(index, index + 100).trim();
            }
        }
        return null;
    }
};
