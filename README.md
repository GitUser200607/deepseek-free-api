# DeepSeek Free API Proxy

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-teal)](https://fastapi.tiangolo.com/)

Reverse-engineers **DeepSeek web free chat** (chat.deepseek.com) into an **OpenAI-compatible API**, supporting dynamic model discovery, automated PoW solving, automatic token refresh, and a pure chat version (no-tools branch, no tool call prompt injection).

**Note:** All modified code in this project is AI-generated, without a single line of human-written code.

[zhangjiabo522](https://github.com/zhangjiabo522) — Special thanks for providing model tokens and computing power for testing Vision features.

> **💡 Don't need tool calling?** If your use case is pure conversation (writing, translation, coding, Q&A), we recommend using the [`no-tools` branch](#no-tools-branch) — no tool prompt injection, cleaner context, higher output quality.

> **Reference project:** [NIyueeE/ds-free-api](https://github.com/NIyueeE/ds-free-api) (Rust version). This project is a Python rewrite.
> The Rust original uses browser automation (Playwright/Chrome), while this Python version uses **pure HTTP forwarding** (curl_cffi simulating Chrome TLS fingerprint) for lower resource usage.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
  - [One-Click Deployment (Recommended)](#one-click-deployment-recommended)
  - [Manual Installation](#manual-installation)
- [Authentication Setup](#authentication-setup)
  - [Method 1: Phone/Email Login (Recommended)](#method-1-phoneemail-login-recommended)
  - [Method 2: cURL Import](#method-2-curl-import)
  - [Method 3: Cookie Import](#method-3-cookie-import)
- [API Usage](#api-usage)
  - [List Models](#1-list-models)
  - [Non-Streaming Chat](#2-non-streaming-chat)
  - [Streaming Chat](#3-streaming-chat)
  - [Refresh Models](#7-refresh-models)
- [Anthropic Messages API](#6-anthropic-messages-api)
- [Responses API](#5-responses-apiopenai-compatible)
- [Model System](#model-system)
  - [Dynamic Model Discovery](#dynamic-model-discovery)
  - [Currently Available Models](#currently-available-models)
- [Tool Calling Details](#tool-calling-details)
- [No-Tools Branch](#no-tools-branch)
- [PoW Solving Mechanism](#pow-solving-mechanism)
- [Automatic Token Refresh](#automatic-token-refresh)
- [Administration Commands](#administration-commands)
- [Project Structure](#project-structure)
- [Configuration Reference](#configuration-reference)
- [Dependencies](#dependencies)
- [Limitations & Known Issues](#limitations--known-issues)
- [FAQ](#faq)
- [License & Acknowledgments](#license--acknowledgments)

## Features

- **Fully OpenAI Compatible** — `/v1/chat/completions` (streaming/non-streaming), `/v1/models`, `/v1/models/refresh`, **`/v1/responses`** endpoints
- **OpenAI Responses API** — New `/v1/responses` create/retrieve/delete/input_items/cancel/compact, complete SSE lifecycle events, Structured Output support
- **Pure Chat Proxy** — No tool call prompt injection, cleaner output, model attention fully on user queries
- **Dynamic Model Discovery** — Real-time model list detection from DeepSeek official API on startup, auto-refreshed hourly (including full info like context size)
- **Automated PoW Solving** — Node.js WASM primary solver + Python pure algorithm fallback, automatically fetches challenge and solves before each request
- **Automatic Token Refresh** — Automatically re-login using saved password when 401 detected, no manual intervention needed
- **Deep Reasoning** — Supports DeepSeek's `<thought>` tags, separated as `reasoning_content` in streaming output
- **Vision Image Understanding** — Supports image upload, parsing, and conversation
- **Text File Upload** — Supports .txt/.md/.py and other text files for direct upload to conversation, uses ref_file_ids (consistent with web version)
- **Web Search** — Supports `search_enabled` parameter for search model variants
- **Admin Panel** — Embedded single-file Web UI supporting phone/email login and cURL import
- **Pure HTTP Solution** — No browser/Playwright/Chrome dependency, uses curl_cffi to simulate Chrome TLS fingerprint
- **No-Tools Branch** — Provides `no-tools` branch that removes tool calling logic, ideal for pure conversation scenarios with higher output quality

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     OpenAI Compatible Client                │
│            (ChatBox / LobeChat / curl / Cline)             │
└───────────────┬──────────────────────────────────────────┘
                │  /v1/chat/completions
                ▼
┌──────────────────────────────────────────────────────────┐
│                 DeepSeek Free API Proxy (FastAPI)           │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Routing │  │  tool_call   │  │  tool_sieve  │  │  tool_dsml   │  │   curl_cffi Client    │ │
│  │ /v1/*   │──│ (DSML Prompt)│──│ (Stream Sieve)│──│ (DSML Parse) │──│ (Chrome Fingerprint)  │ │
│  └─────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Model    │  │   PoW Solver │  │   Auto Token Refresh  │ │
│  │ Discovery│  │ (Node+Python)│  │ (Saved Password Auto) │ │
│  │ (Dynamic)│  │              │  │     -relogin)         │ │
│  └─────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌─────────┐  ┌──────────────────────────┐              │
│  │ Vision  │  │ File Upload/Parse        │              │
│  │ Image   │  │ (Image: upload→fork→wait) │              │
│  │ Understanding│  │ (Text: upload→wait)      │              │
│  └─────────┘  └──────────────────────────┘              │
└───────────────┬──────────────────────────────────────────┘
                │  HTTPS (curl_cffi, Chrome Fingerprint)
                ▼
┌──────────────────────────────────────────────────────────┐
│        DeepSeek API (chat.deepseek.com)                   │
│  /api/v0/chat/completion (SSE)                            │
│  /api/v0/users/login                                     │
│  /api/v0/chat_session/create                             │
│  /api/v0/chat/create_pow_challenge                       │
│  /api/v0/client/settings?scope=model                     │
│  /api/v0/file/upload_file + fork_file_task               │
└──────────────────────────────────────────────────────────┘
```

## Quick Start

### One-Click Deployment (Recommended)

```bash
# First install Node.js (required for PoW solver)
# Termux:
pkg install nodejs

# Linux:
# sudo apt install nodejs

# Clone directly (recommended)
git clone https://github.com/Fly143/deepseek-free-api.git
cd deepseek-free-api
chmod +x deploy.sh

# Start in foreground (Ctrl+C to stop)
./deploy.sh

# Or start in background
./deploy.sh --bg

# Check status
./deploy.sh --status

# Stop
./deploy.sh --stop
```

After deployment, access: **http://localhost:8000/admin**

> 💡 **Don't need tool calling?** Clone the [`no-tools` branch](https://github.com/Fly143/deepseek-free-api/tree/no-tools) for a cleaner pure chat version (no prompt injection, higher output quality).

### Manual Installation

```bash
# 1. Ensure you have Python 3.10+ and Node.js
python3 --version
node --version

# 2. Install Python dependencies
pip install fastapi uvicorn curl-cffi python-dotenv

# 3. Start
python3 proxy.py
```

## Authentication Setup

Open the admin panel at http://localhost:8000/admin to configure.

### Method 1: Phone/Email Login (Recommended)

The most convenient method, same experience as web login:

1. Select the **Phone** or **Email** tab
2. Enter your phone number (default area code +86) or email
3. Enter your password
4. Click **Login**

The system will automatically: Login to get Token → Create chat session → Save configuration to `token.json` (includes password for auto-refresh).

### Method 2: cURL Import

1. Log in to chat.deepseek.com
2. Open **Developer Tools** → **Network** panel
3. Send a message and find the `completion` request
4. Right-click → **Copy as cURL**
5. In the admin panel, expand **Advanced: Manually paste cURL**, paste it in
6. Click **Save cURL**

### Method 3: Cookie Import

1. Log in to chat.deepseek.com
2. Open **Developer Tools** → **Application** → **Cookies**
3. Find the Cookie for `chat.deepseek.com`
4. Export the Cookie string containing `userToken`
5. Paste it into the admin panel → Save

## API Usage

### 1. List Models

```bash
curl http://localhost:8000/v1/models
```

Returns all dynamically detected available models, including detailed information such as `max_input_tokens`, `max_output_tokens`, etc.

### 2. Non-Streaming Chat

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-default",
    "messages": [
      {"role": "user", "content": "Write a quick sort in Python"}
    ]
  }'
```

### 3. Streaming Chat

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-reasoner",
    "messages": [
      {"role": "user", "content": "Explain quantum entanglement"}
    ],
    "stream": true
  }'
 ```

In streaming responses, reasoning content appears in the `delta.reasoning_content` field, and the actual content appears in `delta.content`.

### 4. File Upload (Text & Images)

**Text File Upload** (supported by all models, no fork, uses `ref_file_ids`):

```bash
# Prepare file base64
FILE_B64=$(base64 -w0 three_body_intro.txt)

curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-default",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is the content of this file?"},
        {"type": "file", "file": {"filename": "three_body_intro.txt", "file_data": "'"$FILE_B64"'"}}
      ]
    }]
  }'
```

**Vision Image Upload** (requires Vision model, upload then fork to vision type):

```bash
# Prepare image base64
IMG_B64=$(base64 -w0 photo.png)

curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-vision",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "Describe this image"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,'"$IMG_B64"'"}}
      ]
    }]
  }'
```

> **Note:** Text files are not forked; they directly reference the original `file_id` after DeepSeek finishes parsing. Images need to be forked to `"vision"` to be readable by the Vision model.

### 5. Responses API (OpenAI Compatible)

Supports OpenAI's latest `/v1/responses` endpoint. Non-streaming:

```bash
curl http://localhost:8000/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek",
    "input": "Write a quick sort in Python",
    "stream": false
  }'
```

Streaming (with complete SSE lifecycle events):

```bash
curl http://localhost:8000/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek",
    "input": "Explain quantum entanglement",
    "stream": true
  }'
```

Events: `response.created` → `response.in_progress` → `response.output_item.added` → `response.content_part.added` → `response.output_text.delta`(Chunk by chunk) → `response.output_text.done` → `response.content_part.done` → `response.output_item.done` → `response.completed`

Other endpoints (support streaming replay):

```bash
# Retrieve
curl http://localhost:8000/v1/responses/{response_id}

# Input items
curl http://localhost:8000/v1/responses/{response_id}/input_items

# Cancel
curl -X POST http://localhost:8000/v1/responses/{response_id}/cancel

# Delete
curl -X DELETE http://localhost:8000/v1/responses/{response_id}

# Compact multi-turn conversation
curl -X POST http://localhost:8000/v1/responses/{response_id}/compact \
  -H "Content-Type: application/json" \
  -d '{"instructions": "Please answer all following questions in English"}'
```

Structured Output（json_schema）：

```bash
curl http://localhost:8000/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek",
    "input": "Beijing weather is 25°C today, please return structured data",
    "text": {
      "format": {
        "type": "json_schema",
        "schema": {
          "type": "object",
          "properties": {
            "city": {"type": "string"},
            "temperature": {"type": "integer"},
            "unit": {"type": "string"}
          },
          "required": ["city", "temperature", "unit"]
        }
      }
    }
  }'
```

> The Responses API is a supplement to the existing `/v1/chat/completions` endpoint; both can be used simultaneously.

### 6. Anthropic Messages API

This proxy is fully compatible with the **Anthropic Messages API** format, supporting seamless integration with clients such as RikkaHub.

**Authentication method**: Use either the `x-api-key` header or `Authorization: Bearer`:

```bash
# x-api-key method (recommended)
curl http://localhost:8000/v1/messages \
  -H "x-api-key: sk-dsapi" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-default",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Write a quick sort in Python"}
    ]
  }'
```

**Streaming (reasoning chain + text):**

```bash
curl http://localhost:8000/v1/messages \
  -H "x-api-key: sk-dsapi" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-reasoner",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {"role": "user", "content": "Explain quantum entanglement"}
    ]
  }'
```

Reasoning content flows in real-time as `thinking` blocks, and text flows as `text` blocks.

**Available endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/messages` | Send message (text/reasoning chain/tool call) |
| POST | `/v1/messages/count_tokens` | Count tokens |
| GET | `/v1/messages/{id}` | Retrieve sent message |
| POST | `/v1/messages/batches` | Create batch request |
| GET | `/v1/messages/batches` | List batch requests |
| GET | `/v1/messages/batches/{id}` | Retrieve batch details |
| POST | `.../cancel` | Cancel batch |
| GET | `.../results` | Download batch results |
| DELETE | `/v1/messages/batches/{id}` | Delete batch |

> **Note:** The `/v1/messages` endpoint in the no-tools branch does **not** support the `tools` parameter, making it cleaner for pure conversation scenarios.

#### Anthropic Model Name Mapping

Tools like Claude Code CLI expect Anthropic-style model names (e.g., `claude-sonnet-4-6`) and cannot directly use native `deepseek-*` names. This proxy automatically maps them internally within the Anthropic endpoint:

| Claude Model Name | → DeepSeek Internal | Reasoning | Web Search |
|-------------------|---------------------|-----------|-------------|
|---|---|---|---|
| `claude-opus-4-6` | `deepseek-expert-reasoner` | ✓ | ✗ |
| `claude-opus-4-6-search` | `deepseek-expert-reasoner-search` | ✓ | ✓ |
| `claude-sonnet-4-6` | `deepseek-reasoner` | ✓ | ✗ |
| `claude-sonnet-4-6-search` | `deepseek-reasoner-search` | ✓ | ✓ |
| `claude-haiku-4-5` | `deepseek-default` | ✗ | ✗ |
| `claude-sonnet-4-6-nothinking` | `deepseek-default` | ✗ | ✗ |
| `claude-3-7-sonnet` | `deepseek-reasoner` | ✓ | ✗ |
| `claude-3-5-sonnet` | `deepseek-default` | ✗ | ✗ |
| `claude-3-opus` | `deepseek-expert-reasoner` | ✓ | ✗ |

Claude 4.x historical names (e.g., `claude-sonnet-4-5`, `claude-opus-4-1`, etc.) and `-nothinking` variants are also supported. Native DeepSeek names (`deepseek-*`) continue to work directly. `/v1/models` still returns native names, which does not affect other software.

```bash
# Using Claude model names also works
curl http://localhost:8000/v1/messages \
  -H "x-api-key: sk-dsapi" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":100,"messages":[{"role":"user","content":"hi"}]}'
```

### 7. Refresh Models

```bash
# Force refresh model list (no need to wait for 1-hour cache expiration)
curl -X POST http://localhost:8000/v1/models/refresh
```

## Model System

### Dynamic Model Discovery

On startup, automatically calls DeepSeek's official API `GET /api/v0/client/settings?scope=model` to retrieve currently available model configurations.

Core discovery logic (`proxy.py:418`):

```python
def _discover_models():
    resp = cffi_requests.get(
        "https://chat.deepseek.com/api/v0/client/settings?scope=model",
        headers={"Authorization": f"Bearer {token}", ...}
    )
    # Parse model_configs, generate base/reasoning/search/reasoning+search variants by model_type
```

- **Auto-detection**: No need to manually update the model list
- **1-hour cache**: Avoids frequent requests
- **Manual refresh**: `POST /v1/models/refresh`
- **Fault tolerance**: Detection failure does not affect the cached list

Information returned for each model includes:
- `max_input_tokens` — Maximum input tokens
- `max_output_tokens` — Maximum output tokens (including reasoning)
- `thinking_enabled` — Whether deep reasoning is supported
- `search_enabled` — Whether web search is supported

### Currently Available Models

The model list **changes dynamically with DeepSeek official updates**. Currently detected: 3 base models × 4 variants = 12 models:


| Model ID | Display Name | Description | Reasoning | Web Search |
|----------|--------------|-------------|:---------:|:-----------:|
| `deepseek-default` | DeepSeek V4 Flash Base | V4 Flash fast base model | ✗ | ✗ |
| `deepseek-reasoner` | DeepSeek V4 Flash Reasoning | V4 Flash + deep reasoning | ✓ | ✗ |
| `deepseek-search` | DeepSeek V4 Flash Search | V4 Flash + web search | ✗ | ✓ |
| `deepseek-reasoner-search` | DeepSeek V4 Flash Reasoning+Search | V4 Flash + reasoning + search | ✓ | ✓ |
| `deepseek-expert` | DeepSeek V4 Pro Base | V4 Pro expert base model | ✗ | ✗ |
| `deepseek-expert-reasoner` | DeepSeek V4 Pro Reasoning | V4 Pro + deep reasoning | ✓ | ✗ |
| `deepseek-expert-search` | DeepSeek V4 Pro Search | V4 Pro + web search | ✗ | ✓ |
| `deepseek-expert-reasoner-search` | DeepSeek V4 Pro Reasoning+Search | V4 Pro + reasoning + search | ✓ | ✓ |
| `deepseek-vision` | DeepSeek Vision Base | Image understanding base model | ✗ | ✗ |
| `deepseek-vision-reasoner` | DeepSeek Vision Reasoning | Image understanding + deep reasoning | ✓ | ✗ |

> **Note:**
> - If DeepSeek releases new models, the proxy will automatically discover them without requiring code changes
> - All models explicitly specify `model_type` (`default` / `expert` / `vision`), ensuring proper routing to DeepSeek
> - Model names are pure English IDs; see the table above for Chinese equivalents

## Branch Information

This repository provides two branches:

| Branch | Features |
|--------|----------|
| `main` (current branch) | Full-featured version — Supports DSML tool calling, streaming sieve, session management, etc. Use when tool calling is needed |
| `no-tools` | Pure chat proxy — No tool call prompt injection, cleaner output. Suitable for writing, translation, code generation, and similar scenarios |

> You are currently using the `main` branch. For the pure chat version (no tool calling), please switch to the `no-tools` branch:

> ```bash
> git checkout no-tools
> ```


## Tool Calling Details

The DeepSeek web interface does **not** support the OpenAI function calling format. This proxy implements tool calling through **DSML prompt injection + multi-strategy extraction**:

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer sk-dsapi" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "What's the weather like in Beijing?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get weather information",
        "parameters": {
          "type": "object",
          "properties": {"city": {"type": "string"}},
          "required": ["city"]
        }
      }
    }]
  }'
```

### DSML Prompt Injection

Converts OpenAI tool definitions into DSML format and injects them into the system message:

```xml
<|DSML|tool_calls>
  <|DSML|invoke name="search_file">
    <|DSML|parameter name="query"><![CDATA[config.yaml]]></|DSML|parameter>
  </|DSML|invoke>
</|DSML|tool_calls>
```

### Extraction Strategies

| Priority | Format | Description |
|----------|--------|-------------|
| DSML | `<\|

DSML\|tool_calls><\|DSML\|invoke name="X">...</\|DSML\|invoke></\|DSML\|tool_calls>` | Primary format, tolerant of 7 noise variants |
| TOOL_CALL | `TOOL_CALL: name(key=value)` | Legacy format fallback |
| JSON | `{"name":"x","arguments":{...}}` | JSON block parsing |
| XML | `<tool_call><function=NAME>...</function></tool_call>` | Native XML |
| Mixed | `<function_call>{...}</function_call>` | XML+JSON |

### Fault Tolerance

- **Noise tolerance** — Supports 7 variants including missing pipes, duplicate `<`, full-width `｜`, hyphen `dsml-`, etc.
- **Fenced code blocks** — Automatically skips DSML examples inside markdown code blocks
- **JSON repair** — Auto-fixes unquoted keys and missing array brackets
- **CDATA protection** — Preserves raw strings for parameters like content/command/prompt
- **Missing opening tags** — Auto-restores when closing tag exists without opening

## PoW Solving Mechanism

DeepSeek requires **Proof of Work (PoW)** verification for the `/api/v0/chat/completion` endpoint.

### Flow

1. Call `POST /api/v0/chat/create_pow_challenge` before each request to get a challenge
2. Solve the challenge → obtain `x-ds-pow-response` header
3. Attach the solve result to the chat request headers

### Dual Solvers

| Solver | Method | Speed | Compatibility |
|--------|--------|-------|---------------|
| Node.js WASM | `node pow_solver.js` subprocess | Fast (seconds) | Algorithm matches official |
| Python Fallback | `hashlib.sha3_256` pure Python | Slower | Fallback when Node.js unavailable |

Requires Node.js installation + `sha3_wasm_bg.wasm` file (included in the project).

### Algorithm

DeepSeek uses a custom algorithm `DeepSeekHashV1`, which is essentially SHA3-256 hash collision. The WASM version (called from Node.js) perfectly matches the official algorithm.

## Automatic Token Refresh

Token validity is approximately **24 hours**. When a request returns 401:

1. 401 detected → triggers `relogin()` function
2. Uses saved password to call `POST /api/v0/users/login` again
3. Gets new token → creates new session → saves to `token.json`
4. **Retries current request** with the new token (transparent to user)

> **Prerequisite:** Initial configuration must use **account password login**. Pure cURL/Cookie import does not contain a password and cannot auto-refresh.

## Administration Commands

```bash
# Run in foreground
python3 proxy.py

# Start in background
./deploy.sh --bg

# Check running status
./deploy.sh --status

# Stop background process
./deploy.sh --stop

# View real-time logs (when running in background)
tail -f ~/dsapi.log

# Specify port
PROXY_PORT=9000 python3 proxy.py

# Force refresh model list
curl -X POST http://localhost:8000/v1/models/refresh

# Health check
curl http://localhost:8000/health
```

**After startup:**

| Address | Description |
|---------|-------------|
| `http://localhost:8000/admin` | Web admin panel (login configuration) |
| `http://localhost:8000/v1` | OpenAI-compatible API root path |
| `http://localhost:8000/health` | Health check endpoint |

## Project Structure

```
ds-free-api/
├── proxy.py              # Main program: FastAPI app, SSE parsing, OpenAI endpoints, admin panel
├── response_store.py     # Responses API local persistence (JSON file)
├── pow_native.py         # PoW solver: Node.js WASM primary solver + Python fallback
├── pow_solver.js         # Node.js PoW solving script (calls WASM)
├── sha3_wasm_bg.wasm     # SHA3 WASM binary
├── deploy.sh             # One-click deployment script (install dependencies, start/stop/status management)
├── requirements.txt      # Python dependencies
├── token.example.json    # Configuration template
└── token.json            # Actual configuration (.gitignore, contains credentials)
```

### Core Files Description

| File | Responsibility | Lines |
|------|----------------|-------|
| `proxy.py` | Application entry, routing, SSE parsing, DeepSeek API interaction, token refresh, admin panel UI | ~3770 |
| `response_store.py` | Responses API local persistence (thread-safe JSON file read/write) | ~73 |
| `pow_native.py` | PoW solver (Node.js subprocess + Python pure algorithm fallback) | ~124 |
| `deploy.sh` | One-click deployment (environment check, dependency installation, start/stop/status) | ~198 |

## Configuration Reference

`token.json` Complete configuration items：

```json
{
  "token": "eyJ...",
  "session_id": "abc-def-123...",
  "headers": {
    "content-type": "application/json",
    "origin": "https://chat.deepseek.com",
    "referer": "https://chat.deepseek.com/",
    "user-agent": "Mozilla/5.0 ...",
    "x-client-version": "2.0.2",
    "x-client-platform": "web",
    "authorization": "Bearer YOUR_TOKEN"
  },
  "account": "+86 138xxxx",
  "login_type": "phone",
  "_password": "your_password",
  "_email": "",
  "_mobile": "138xxxx",
  "_area_code": "+86"
}
```

| Configuration | Description | Auto-generated |
|---------------|-------------|:--------------:|
| `token` | Bearer Token (approx. 24-hour validity) | ✓ |
| `session_id` | Chat session ID (UUID) | ✓ |
| `headers` | Request headers (including UA, authorization, etc.) | ✓ |
| `account` | Account identifier (for display) | ✓ |
| `login_type` | Login method: `phone` / `email` | First-time setup |
| `_password` | Login password (for auto-refresh) | First-time setup |
| `_mobile` | Phone number (for auto-refresh) | First-time setup |
| `_email` | Email (for auto-refresh) | First-time setup |
| `_area_code` | Area code (default +86) | First-time setup |

> **Security Note:** `_password` is stored in plain text in the local file. Ensure `token.json` has proper permissions (`chmod 600`) and is excluded when distributing/packaging (already added to `.gitignore`).

**Environment Variable:** `PROXY_PORT` — Listening port (default `8000`)

## Dependencies

### Python (pip)

```bash
pip install fastapi uvicorn curl-cffi python-dotenv
```

| Dependency | Purpose |
|------------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `curl-cffi` | HTTP client (simulates Chrome TLS fingerprint, bypasses anti-scraping) |
| `python-dotenv` | Environment variable loading |

### System

- **Node.js** — PoW solver (required, install with `pkg install nodejs` or `apt install nodejs`)
- Python 3.10+ — Runtime environment

## Limitations & Known Issues

| Limitation | Description |
|------------|-------------|
| Token validity | Expires in approx. 24 hours, requires password login for auto-refresh |
| Concurrency limit | DeepSeek free tier limits ~2 concurrent requests per account |
| Only Chat Completions + Responses | Does not support Embeddings, Fine-tuning, etc. |
| PoW overhead | Each request requires fetching and solving PoW challenge (Node.js: ~1-3 seconds) |
| Non-streaming via SSE | DeepSeek only provides SSE streams; non-streaming requests buffer all SSE and merge before returning |
| Vision non-streaming | Vision models have no content output in streaming mode; internally uses non-streaming then wraps as SSE |

## FAQ

**Q: Admin page is blank after startup?**
A: The admin panel is a single-file HTML embedded in `proxy.py`. Check for JavaScript errors (F12 Console). Ensure you're accessing `http://localhost:8000/admin` directly.

**Q: Prompt says "Update to the latest version to use Expert/Vision"?**
A: The `x-client-version` needs to match the DeepSeek web version (currently `2.0.2`). This is automatically set when the proxy starts.

**Q: PoW solving fails?**
A: Check if Node.js is installed (`node --version`). If Node.js solving fails, the proxy will automatically fall back to Python pure algorithm solving (slower but no external dependencies).

**Q: Login says incorrect password?**
A: Verify the password is correct. DeepSeek passwords require at least 8 characters, including letters and numbers. In some cases, you may need to complete a CAPTCHA verification first.

**Q: What happens when the token expires?**
A: If configured via **account password login**, the proxy will automatically re-login and refresh the token on 401. If imported via cURL/Cookie, you'll need to manually re-import.

**Q: I specified an expert model but the conversation history shows "Fast Mode" (default)?**
A: This usually indicates token or session expiration. When credentials expire, DeepSeek downgrades the request to the default model. Solution: On the admin panel at `http://localhost:8000/admin`, **re-login** using your phone/email. After login, the token and session will be automatically refreshed.

**Q: Can I deploy this to a public server?**
A: Yes, but it's recommended to use Nginx reverse proxy + HTTPS + IP whitelisting. API keys are not validated (any value works), so access control should be managed through other means.

## License & Acknowledgments

MIT License

**Reference Projects:**
- [NIyueeE/ds-free-api](https://github.com/NIyueeE/ds-free-api) — Rust original, provided DeepSeek API reverse engineering ideas and PoW algorithm reference
- [CJackHwang/ds2api](https://github.com/CJackHwang/ds2api) — DSML tool calling format, streaming sieve architecture, and DeepSeek native conversation markers referenced from this project
- [GoblinHonest/mimo2api_mimoapi](https://github.com/GoblinHonest/mimo2api_mimoapi) — Session management (message fingerprint continuation, auto-clear on token overflow) design referenced
- [Acidmoon](https://github.com/Acidmoon) — Submitted PR #2, implementing OpenAI Responses API compatibility layer
- [xstjmark21-cmyk](https://github.com/xstjmark21-cmyk) — Provided model tokens and computing power for testing Vision feature modifications