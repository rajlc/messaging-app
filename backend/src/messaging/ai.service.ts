import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SettingsService } from '../settings/settings.service';

export interface AiChatMessage {
    sender: 'customer' | 'agent' | string;
    text: string;
    imageUrl?: string;
    image_url?: string;
    fileType?: string;
    file_type?: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(private readonly settingsService: SettingsService) { }

    /**
     * Generate an AI reply using the configured provider (OpenAI or Google Gemini)
     */
    async generateReply(params: {
        systemPrompt: string;
        history: AiChatMessage[];
        userMessage: string;
    }): Promise<string | null> {
        const { systemPrompt, history, userMessage } = params;
        const aiProvider = (await this.settingsService.getSetting('ai_provider')) || 'openai';

        if (aiProvider === 'gemini') {
            return this.generateGeminiReply({ systemPrompt, history, userMessage });
        } else {
            return this.generateOpenAiReply({ systemPrompt, history, userMessage });
        }
    }

    /**
     * Google Gemini implementation
     */
    private async generateGeminiReply(params: {
        systemPrompt: string;
        history: AiChatMessage[];
        userMessage: string;
    }): Promise<string | null> {
        const { systemPrompt, history, userMessage } = params;
        const geminiKey = await this.settingsService.getSetting('gemini_api_key');
        if (!geminiKey) {
            this.logger.warn('[AI/Gemini] No gemini_api_key configured.');
            return null;
        }

        const geminiModel = (await this.settingsService.getSetting('gemini_model')) || 'gemini-flash-latest';
        this.logger.log(`[AI/Gemini] Requesting response with model: ${geminiModel}`);

        const contents = this.formatGeminiContents(history, userMessage);

        try {
            return await this.callGeminiApi({
                geminiKey,
                model: geminiModel,
                contents,
                systemPrompt
            });
        } catch (err: any) {
            this.logger.warn(
                `[AI/Gemini] Model "${geminiModel}" call failed: ${err.response?.data?.error?.message || err.message}`
            );

            // If a specific model failed, attempt fallback to gemini-flash-latest
            if (geminiModel !== 'gemini-flash-latest') {
                this.logger.log('[AI/Gemini] Attempting fallback to gemini-flash-latest...');
                try {
                    return await this.callGeminiApi({
                        geminiKey,
                        model: 'gemini-flash-latest',
                        contents,
                        systemPrompt
                    });
                } catch (fallbackErr: any) {
                    this.logger.error(
                        `[AI/Gemini] Fallback also failed: ${fallbackErr.response?.data?.error?.message || fallbackErr.message}`
                    );
                }
            }
            return null;
        }
    }

    /**
     * Call the Gemini generateContent REST endpoint
     */
    private async callGeminiApi(params: {
        geminiKey: string;
        model: string;
        contents: any[];
        systemPrompt?: string;
    }): Promise<string | null> {
        const { geminiKey, model, contents, systemPrompt } = params;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

        const body: any = {
            contents,
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7
            }
        };

        if (systemPrompt && systemPrompt.trim().length > 0) {
            body.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        const res = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey
            },
            timeout: 60000
        });

        const candidates = res.data?.candidates;
        if (!candidates || candidates.length === 0) {
            this.logger.warn('[AI/Gemini] No candidates returned.');
            return null;
        }

        const parts = candidates[0]?.content?.parts || [];
        // Filter out internal thought blocks if thinking mode is present
        const textParts = parts.filter((p: any) => p.text && !p.thought);
        const reply = textParts.map((p: any) => p.text).join('\n') || parts[0]?.text || null;

        return reply ? reply.trim() : null;
    }

    /**
     * Gemini requires strictly alternating user and model turns, starting with user.
     * This utility cleans and merges consecutive messages from the same role.
     */
    private formatGeminiContents(history: AiChatMessage[], userMessage: string) {
        const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = [];

        for (const msg of history) {
            let msgText = msg.text?.trim() || '';
            const imgUrl = msg.imageUrl || msg.image_url;
            if (!msgText && imgUrl) {
                msgText = '[Customer sent a product image/photo]';
            } else if (imgUrl && !msgText.includes('[image]')) {
                msgText = `${msgText} [Customer sent an image]`;
            }
            if (!msgText) continue;
            const role = msg.sender === 'customer' ? 'user' : 'model';
            rawTurns.push({ role, text: msgText });
        }

        if (userMessage && userMessage.trim()) {
            rawTurns.push({ role: 'user', text: userMessage.trim() });
        }

        const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

        for (const turn of rawTurns) {
            if (contents.length === 0) {
                // First turn must be user
                if (turn.role !== 'user') continue;
                contents.push({ role: 'user', parts: [{ text: turn.text }] });
            } else {
                const prev = contents[contents.length - 1];
                if (prev.role === turn.role) {
                    // Combine consecutive turns of the same role
                    prev.parts[0].text += `\n${turn.text}`;
                } else {
                    contents.push({ role: turn.role, parts: [{ text: turn.text }] });
                }
            }
        }

        if (contents.length === 0) {
            contents.push({ role: 'user', parts: [{ text: userMessage || 'Hello' }] });
        }

        return contents;
    }

    /**
     * OpenAI implementation
     */
    private async generateOpenAiReply(params: {
        systemPrompt: string;
        history: AiChatMessage[];
        userMessage: string;
    }): Promise<string | null> {
        const { systemPrompt, history, userMessage } = params;
        const apiKey = await this.settingsService.getSetting('openai_api_key');
        if (!apiKey) {
            this.logger.warn('[AI/OpenAI] No openai_api_key configured.');
            return null;
        }

        const openaiModel = (await this.settingsService.getSetting('openai_model')) || 'gpt-4o-mini';
        this.logger.log(`[AI/OpenAI] Calling OpenAI with model: ${openaiModel}`);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => {
                let msgText = msg.text?.trim() || '';
                const imgUrl = msg.imageUrl || msg.image_url;
                if (!msgText && imgUrl) {
                    msgText = '[Customer sent a product image/photo]';
                } else if (imgUrl && !msgText.includes('[image]')) {
                    msgText = `${msgText} [Customer sent an image]`;
                }
                return {
                    role: msg.sender === 'customer' ? 'user' : 'assistant',
                    content: msgText || '[Empty message]'
                };
            }),
            { role: 'user', content: userMessage }
        ];

        try {
            const aiResponse = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: openaiModel,
                    messages: messages,
                    max_tokens: 350
                },
                {
                    headers: { Authorization: `Bearer ${apiKey}` },
                    timeout: 25000
                }
            );
            return aiResponse.data.choices[0]?.message?.content || null;
        } catch (openaiErr: any) {
            this.logger.warn(
                `[AI/OpenAI] Model "${openaiModel}" failed (${openaiErr.response?.status || openaiErr.message}). Falling back to gpt-4o-mini...`
            );
            try {
                const fallbackResponse = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: 'gpt-4o-mini',
                        messages: messages,
                        max_tokens: 350
                    },
                    {
                        headers: { Authorization: `Bearer ${apiKey}` },
                        timeout: 25000
                    }
                );
                return fallbackResponse.data.choices[0]?.message?.content || null;
            } catch (fallbackErr: any) {
                this.logger.error(
                    `[AI/OpenAI] Fallback failed: ${fallbackErr.response?.data?.error?.message || fallbackErr.message}`
                );
                return null;
            }
        }
    }

    /**
     * Test connection directly with user-provided parameters
     */
    async testConnection(params: {
        provider: 'openai' | 'gemini';
        apiKey: string;
        model: string;
    }): Promise<{ success: boolean; message: string; reply?: string }> {
        const { provider, apiKey, model } = params;

        if (!apiKey || !apiKey.trim()) {
            return { success: false, message: `Please provide a valid ${provider.toUpperCase()} API Key.` };
        }

        const testPrompt = 'A customer says: "Hello! What is your store name and are you open?" Reply in 1-2 friendly, polite sentences.';

        if (provider === 'gemini') {
            const selectedModel = model || 'gemini-3.5-flash-lite';
            const testPrompt = 'A customer says: "Hello! What is your store name and are you open?" Reply in 1-2 friendly, polite sentences.';

            try {
                this.logger.log(`[AI/Test] Testing Gemini connection with model: ${selectedModel}`);
                const res = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`,
                    {
                        contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
                        generationConfig: {
                            maxOutputTokens: 80,
                            temperature: 0.5
                        }
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKey.trim()
                        },
                        timeout: 50000
                    }
                );

                const parts = res.data?.candidates?.[0]?.content?.parts || [];
                const textParts = parts.filter((p: any) => p.text && !p.thought);
                const reply = textParts.map((p: any) => p.text).join(' ') || parts[0]?.text || null;

                if (reply) {
                    return {
                        success: true,
                        message: `Connection successful with Google Gemini (${selectedModel})!`,
                        reply: reply.trim()
                    };
                }
                return { success: false, message: 'No response received from Gemini.' };
            } catch (err: any) {
                // If a slow model like gemini-3.6-flash timed out, attempt fast check with gemini-3.5-flash-lite
                if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                    if (selectedModel !== 'gemini-3.5-flash-lite') {
                        try {
                            this.logger.log(`[AI/Test] ${selectedModel} timed out. Attempting fast fallback verification with gemini-3.5-flash-lite...`);
                            const fbRes = await axios.post(
                                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`,
                                {
                                    contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
                                    generationConfig: { maxOutputTokens: 80 }
                                },
                                {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-goog-api-key': apiKey.trim()
                                    },
                                    timeout: 15000
                                }
                            );
                            const fbText = fbRes.data?.candidates?.[0]?.content?.parts?.find((p: any) => p.text && !p.thought)?.text;
                            if (fbText) {
                                return {
                                    success: true,
                                    message: `Key is valid! Google's servers were slow on ${selectedModel}. We recommend selecting "Gemini 3.5 Flash Lite" or "Gemini 3.7 Flash" for ultra-fast 1-second replies.`,
                                    reply: fbText.trim()
                                };
                            }
                        } catch {
                            // Fall through
                        }
                    }
                    return {
                        success: false,
                        message: `Gemini API timed out on ${selectedModel}. Please try "Gemini 3.5 Flash Lite" or "Gemini 3.7 Flash" for faster response times.`
                    };
                }
                if (err.response?.status === 429) {
                    return { success: false, message: 'Gemini rate limit reached (429 Too Many Requests). Please wait a few moments and try again.' };
                }
                if (err.response?.status === 503) {
                    return { success: false, message: 'Google Gemini is temporarily experiencing high demand (503). Please retry shortly or switch model.' };
                }
                const errorDetail = err.response?.data?.error?.message || err.message;
                return { success: false, message: `Gemini API Error: ${errorDetail}` };
            }
        } else {
            try {
                const selectedModel = model || 'gpt-4o-mini';
                const res = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: selectedModel,
                        messages: [
                            { role: 'system', content: 'You are an e-commerce customer assistant.' },
                            { role: 'user', content: testPrompt }
                        ],
                        max_tokens: 150
                    },
                    {
                        headers: { Authorization: `Bearer ${apiKey.trim()}` },
                        timeout: 15000
                    }
                );
                const reply = res.data?.choices?.[0]?.message?.content;
                if (reply) {
                    return {
                        success: true,
                        message: `Connection successful with OpenAI (${selectedModel})!`,
                        reply
                    };
                }
                return { success: false, message: 'No response received from OpenAI.' };
            } catch (err: any) {
                const errorDetail = err.response?.data?.error?.message || err.message;
                return { success: false, message: `OpenAI API Error: ${errorDetail}` };
            }
        }
    }

    /**
     * Generate Social Media Post (Caption + Hashtags) based on specifications, image, or both
     */
    async generateSocialPost(params: {
        mode?: 'details' | 'image' | 'combined';
        productName?: string;
        productDetails?: string;
        extraNotes?: string;
        imageUrl?: string;
        imageBase64?: string;
        mimeType?: string;
        tone?: string;
        provider?: 'gemini' | 'openai';
        model?: string;
    }): Promise<{ success: boolean; caption: string; hashtags: string; message?: string }> {
        const { productName, productDetails, extraNotes, imageUrl, imageBase64, mimeType, tone, provider, model } = params;

        const defaultInstructions =
            'Write an engaging, high-converting social media caption for Nepali customers. Highlight key features, include call to action with Cash on Delivery / Free Delivery info, and generate 8-12 relevant, trending hashtags.';
        const customInstructions = (await this.settingsService.getSetting('post_generation_instructions')) || (await this.settingsService.getSetting('ai_post_instructions')) || defaultInstructions;

        const configuredProvider = (await this.settingsService.getSetting('ai_provider')) || 'gemini';
        const activeProvider = provider || (configuredProvider as 'gemini' | 'openai');

        // Build base64 data if image provided
        let resolvedBase64 = imageBase64;
        let resolvedMime = mimeType || 'image/jpeg';

        if (!resolvedBase64 && imageUrl) {
            try {
                this.logger.log(`[AI/Post] Fetching image from URL: ${imageUrl.substring(0, 80)}...`);
                const imgRes = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 20000
                });
                resolvedBase64 = Buffer.from(imgRes.data).toString('base64');
                resolvedMime = (imgRes.headers['content-type'] as string) || 'image/jpeg';
            } catch (fetchErr: any) {
                this.logger.warn(`[AI/Post] Failed to fetch image from URL: ${fetchErr.message}`);
            }
        }

        const hasImage = Boolean(resolvedBase64);

        if (!hasImage && !productName?.trim()) {
            return {
                success: false,
                caption: '',
                hashtags: '',
                message: 'Please provide either a product image or product name to generate post.'
            };
        }

        const infoParts: string[] = [];
        if (productName?.trim()) {
            infoParts.push(`Product Name / Title: ${productName.trim()}`);
        }
        if (productDetails?.trim()) {
            infoParts.push(`Specifications, Highlights & Price: ${productDetails.trim()}`);
        }
        if (extraNotes?.trim()) {
            infoParts.push(`Extra Notes / Offer Details: ${extraNotes.trim()}`);
        }

        let promptText = '';
        if (hasImage && infoParts.length > 0) {
            promptText = `Visually analyze this product image and use the provided product information below to write an engaging, high-converting social media post for Nepali e-commerce customers:\n\n${infoParts.join('\n')}\n\nTone: ${tone || 'High-Converting / Sales-Driven'}`;
        } else if (hasImage) {
            promptText = `Visually analyze this product photo. Identify the product name, key features, color, materials, quality, and appeal, and craft an engaging, high-converting social media post for Nepali e-commerce customers.\n\nTone: ${tone || 'High-Converting / Sales-Driven'}`;
        } else {
            promptText = `Craft an engaging, high-converting social media post for Nepali e-commerce customers based on the following product information:\n\n${infoParts.join('\n')}\n\nTone: ${tone || 'High-Converting / Sales-Driven'}`;
        }

        const systemPrompt = `${customInstructions}\n\nCRITICAL OUTPUT REQUIREMENT:\nYou MUST return a clean JSON object ONLY (do not include markdown code block or backticks) in the following structure:\n{\n  "caption": "The full engaging caption with emojis, highlights, and call to action...",\n  "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5 #hashtag6 #hashtag7 #hashtag8"\n}`;

        try {
            if (activeProvider === 'gemini') {
                return await this.generateGeminiSocialPost({
                    promptText,
                    systemPrompt,
                    base64: resolvedBase64,
                    mimeType: resolvedMime,
                    model
                });
            } else {
                return await this.generateOpenAiSocialPost({
                    promptText,
                    systemPrompt,
                    base64: resolvedBase64,
                    mimeType: resolvedMime,
                    model
                });
            }
        } catch (err: any) {
            this.logger.error(`[AI/Post] Generation failed: ${err.message}`);
            return {
                success: false,
                caption: '',
                hashtags: '',
                message: err.response?.data?.error?.message || err.message
            };
        }
    }

    private async generateGeminiSocialPost(params: {
        promptText: string;
        systemPrompt: string;
        base64?: string;
        mimeType?: string;
        model?: string;
    }): Promise<{ success: boolean; caption: string; hashtags: string; message?: string }> {
        const geminiKey = await this.settingsService.getSetting('gemini_api_key');
        if (!geminiKey) {
            return { success: false, caption: '', hashtags: '', message: 'Gemini API Key is missing in Settings.' };
        }
        const geminiModel = params.model || (await this.settingsService.getSetting('gemini_model')) || 'gemini-3.6-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

        const parts: any[] = [];
        if (params.base64) {
            parts.push({
                inlineData: {
                    mimeType: params.mimeType || 'image/jpeg',
                    data: params.base64
                }
            });
        }
        parts.push({ text: params.promptText });

        const body: any = {
            contents: [{ role: 'user', parts }],
            systemInstruction: { parts: [{ text: params.systemPrompt }] },
            generationConfig: {
                maxOutputTokens: 1500,
                temperature: 0.7,
                responseMimeType: 'application/json'
            }
        };

        const res = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey
            },
            timeout: 60000
        });

        const rawReply = res.data?.candidates?.[0]?.content?.parts?.filter((p: any) => p.text && !p.thought)?.[0]?.text
            || res.data?.candidates?.[0]?.content?.parts?.[0]?.text
            || '';

        return this.parseSocialPostJson(rawReply);
    }

    private async generateOpenAiSocialPost(params: {
        promptText: string;
        systemPrompt: string;
        base64?: string;
        mimeType?: string;
        model?: string;
    }): Promise<{ success: boolean; caption: string; hashtags: string; message?: string }> {
        const apiKey = await this.settingsService.getSetting('openai_api_key');
        if (!apiKey) {
            return { success: false, caption: '', hashtags: '', message: 'OpenAI API Key is missing in Settings.' };
        }
        const openaiModel = params.model || (await this.settingsService.getSetting('openai_model')) || 'gpt-4o-mini';

        const userContent: any[] = [];
        if (params.base64) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${params.mimeType || 'image/jpeg'};base64,${params.base64}`
                }
            });
        }
        userContent.push({ type: 'text', text: params.promptText });

        const res = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: openaiModel,
                messages: [
                    { role: 'system', content: params.systemPrompt },
                    { role: 'user', content: params.base64 ? userContent : params.promptText }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 1500,
                temperature: 0.7
            },
            {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 30000
            }
        );

        const rawReply = res.data?.choices?.[0]?.message?.content || '';
        return this.parseSocialPostJson(rawReply);
    }

    private parseSocialPostJson(raw: string): { success: boolean; caption: string; hashtags: string; message?: string } {
        if (!raw || !raw.trim()) {
            return { success: false, caption: '', hashtags: '', message: 'Empty response from AI.' };
        }

        let caption = '';
        let hashtags = '';

        // 1. Try extracting content inside ```json ... ``` or ``` ... ```
        let jsonCandidate = raw.trim();
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenceMatch) {
            jsonCandidate = fenceMatch[1].trim();
        } else {
            const objMatch = raw.match(/\{[\s\S]*\}/);
            if (objMatch) {
                jsonCandidate = objMatch[0].trim();
            }
        }

        if (jsonCandidate) {
            try {
                const parsed = JSON.parse(jsonCandidate);
                if (parsed.caption || parsed.hashtags) {
                    caption = (parsed.caption || '').trim();
                    hashtags = (parsed.hashtags || '').trim();
                }
            } catch {
                // If direct JSON.parse failed on candidate, try regex extraction on caption and hashtags fields
                const capMatch = jsonCandidate.match(/"caption"\s*:\s*"((?:\\.|[^"\\])*)"/s);
                const hashMatch = jsonCandidate.match(/"hashtags"\s*:\s*"((?:\\.|[^"\\])*)"/s);
                if (capMatch) {
                    try {
                        caption = JSON.parse(`"${capMatch[1]}"`).trim();
                    } catch {
                        caption = capMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
                    }
                }
                if (hashMatch) {
                    try {
                        hashtags = JSON.parse(`"${hashMatch[1]}"`).trim();
                    } catch {
                        hashtags = hashMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
                    }
                }
            }
        }

        // If still no caption parsed from JSON, fallback to hashtag extraction
        if (!caption) {
            const hashtagRegex = /#[a-zA-Z0-9_\u0900-\u097F]+/g;
            const foundTags = raw.match(hashtagRegex) || [];
            let captionWithoutTags = raw.replace(hashtagRegex, '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
            captionWithoutTags = captionWithoutTags.replace(/^\s*\{?\s*"caption"\s*:\s*"?/, '').replace(/"?\s*,?\s*"hashtags"\s*:\s*"?[\s\S]*$/i, '').trim();
            caption = captionWithoutTags || raw;
            hashtags = foundTags.join(' ');
        }

        // Extra guard: If caption itself starts with a JSON object, unpack it
        if (caption.trim().startsWith('{') && caption.includes('"caption"')) {
            try {
                const inner = JSON.parse(caption.trim());
                if (inner.caption) {
                    caption = inner.caption.trim();
                    if (inner.hashtags && !hashtags) hashtags = inner.hashtags.trim();
                }
            } catch {}
        }

        return {
            success: true,
            caption,
            hashtags
        };
    }
}
