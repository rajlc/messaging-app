gpt-5.6-luna
GPT-5.6 Luna
GPT-5.6 model optimized for cost-sensitive workloads
Reasoning
High
Speed
Fast
Price
$0.2
•
$1.2
Input
•
Output
Input
Text, image
Output
Text
GPT-5.6 Luna is designed for cost-sensitive, high-volume workloads. It roughly corresponds to the nano model tier used in earlier GPT-5 families. Reasoning.effort supports: none, low, medium (default), high, xhigh, and max.

1,050,000 context window
128,000 max output tokens
Feb 16, 2026 knowledge cutoff
Reasoning token support
Pricing
Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the pricing page.
Text tokens
Per 1M tokens
Input
$0.20
Cached input
$0.02
Output
$1.20
Quick comparison
Input
Cached input
Output
GPT-5.6 Terra
$2.00
GPT-5.6 Luna
$0.20
GPT-5.4 nano
$0.20
Prompts with >272K input tokens are priced at 2x input and 1.5x output for the full request.

Cache writes are billed at 1.25x the uncached input token rate.

Modalities
Text
Input and output
Image
Input only
Audio
Not supported
Video
Not supported
Endpoints
Chat Completions
v1/chat/completions
Responses
v1/responses
Realtime
v1/realtime
Realtime translation
v1/realtime/translations
Realtime transcription
v1/realtime/transcription_sessions
Assistants
v1/assistants
Batch
v1/batch
Fine-tuning
v1/fine-tuning
Embeddings
v1/embeddings
Image generation
v1/images/generations
Videos
v1/videos
Image edit
v1/images/edits
Speech generation
v1/audio/speech
Transcription
v1/audio/transcriptions
Translation
v1/audio/translations
Moderation
v1/moderations
Completions (legacy)
v1/completions
Features
Streaming
Supported
Function calling
Supported
Structured outputs
Supported
Fine-tuning
Not supported
Tools
Tools supported by this model when using the Responses API.
Web search
Supported
File search
Supported
Image generation
Supported
Code interpreter
Supported
Hosted shell
Supported
Apply patch
Supported
Skills
Supported
Computer use
Supported
MCP
Supported
Tool search
Supported
Snapshots
Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-5.6 Luna.
gpt-5.6-luna
gpt-5.6-luna
gpt-5.6-luna
gpt-5.6-luna
Rate limits
Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.
Tier	RPM	TPM	Batch queue limit
Free	Not supported
Tier 1	500	500,000	5,000,000
Tier 2	5,000	2,000,000	20,000,000
Tier 3	5,000	4,000,000	40,000,000
Tier 4	10,000	10,000,000	1,000,000,000
Tier 5	30,000	180,000,000	15,000,000,000


API Overview
Use this reference to look up OpenAI API endpoints, request and response schemas, streaming events, client library methods, and shared behavior such as authentication, errors, rate limits, and request IDs.

Start here
Choose the API surface for your application:
Responses for direct model requests, tool use, audio, image, and text inputs, and stateful interactions.
Realtime API for low-latency voice or audio sessions over WebRTC, WebSocket, or SIP. Use the client events and server events references while building sessions.
Administration for organization workflows such as users, invites, projects, API keys, and audit logs.
Create credentials. Use a standard API key for application requests, an Admin API key for Administration endpoints, or workload identity federation for short-lived access tokens.
Install an official client library from the libraries page, or call the HTTP API directly from any environment that supports HTTP requests.
Make a first request with the developer quickstart or go straight to the Responses create reference.
Before production, review error codes, rate limits, and request ID logging below.
Authentication
The OpenAI API accepts bearer credentials from API keys or from short-lived access tokens created with workload identity federation.

Remember that your API key is a secret. Don’t share it with others or expose it in any client-side code such as browsers or apps. Load API keys from an environment variable or key management service on the server.

Revocations of an API key take effect within a few seconds. Most updates that affect authentication results of an API key propagate within 15 minutes, but can potentially take longer.

Provide API credentials with HTTP Bearer authentication.

Authorization: Bearer OPENAI_API_KEY_OR_ACCESS_TOKEN

If you belong to more than one organization or access projects through a legacy user API key, pass a header to specify which organization and project to use for an API request:

curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "OpenAI-Organization: $ORGANIZATION_ID" \
  -H "OpenAI-Project: $PROJECT_ID"

Usage from these API requests counts as usage for the specified organization and project. Find organization and project IDs in your dashboard settings.

Request headers
For reliable behavior across API paths and HTTP versions, keep the total size of an API request’s headers under 64 KiB. This budget includes the names and values of all headers, including common headers such as Authorization, Content-Type, and User-Agent, as well as any custom headers.

To leave room for required headers and headers added by intermediaries, keep any individual custom header value and the total size of all custom header values at 60 KiB or less. Requests with larger headers may fail before they reach the API, so you may not receive a response or an x-request-id.

Debugging requests
Error codes describe failures returned from API responses. Inspect HTTP response headers for the unique ID of a request and rate limit details. Common response headers include:

API meta information

openai-organization: The organization associated with the request
openai-processing-ms: Time taken processing your API request
openai-version: REST API version used for this request (currently 2020-10-01)
x-request-id: Unique identifier for this API request (used in troubleshooting)
Rate limiting information

x-ratelimit-limit-requests
x-ratelimit-limit-tokens
x-ratelimit-remaining-requests
x-ratelimit-remaining-tokens
x-ratelimit-reset-requests
x-ratelimit-reset-tokens
x-ratelimit-limit-project-tokens
x-ratelimit-remaining-project-tokens
x-ratelimit-reset-project-tokens
Project-token headers may be present when a project-scoped token limit applies.

OpenAI recommends logging request IDs in production deployments for more efficient troubleshooting with the support team, should the need arise. Official client libraries provide a property on top-level response objects containing the value of the x-request-id header.

Supplying your own request ID with X-Client-Request-Id
Along with the server-generated x-request-id, you can supply your own unique identifier for each request via the X-Client-Request-Id request header. This header isn’t added automatically; you must explicitly set it on the request.

When you include X-Client-Request-Id:

You control the ID format (for example, a UUID or your internal trace ID), but it must contain only ASCII characters and be no more than 512 characters long; otherwise, the request will fail with a 400 error. Make this value unique per request.

OpenAI logs this value internally for supported endpoints, including chat/completions, embeddings, responses, and more.

In cases like timeouts or network issues when you can’t get the X-Request-Id response header, you can share the X-Client-Request-Id value with the support team to look up whether OpenAI received the request and when.

Example:

curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "X-Client-Request-Id: 123e4567-e89b-12d3-a456-426614174000"

Backwards compatibility
OpenAI provides stability to API users by avoiding breaking changes in major API versions whenever reasonably possible. This includes:

The REST API (currently v1)
First-party client libraries (released libraries adhere to semantic versioning)
Model families (like gpt-4o or o4-mini)
Model prompting behavior between snapshots is subject to change. Model outputs are by their nature variable, so expect changes in prompting and model behavior between snapshots. The best way to ensure consistent prompting behavior and model output is to use pinned model versions, and to run evals for your applications.

Backwards-compatible API changes:

Adding new resources (URLs) to the REST API and client libraries
Adding new optional API parameters
Adding new properties to JSON response objects or event data
Changing the order of properties in a JSON response object
Changing the length or format of opaque strings, like resource identifiers
Adding new event types in streaming APIs
See the changelog for a list of backwards-compatible changes and rare breaking changes.