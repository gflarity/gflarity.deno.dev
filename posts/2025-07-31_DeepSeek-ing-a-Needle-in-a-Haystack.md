---
publish_date: 2025-07-31
title: DeepSeek-ing a Needle in a Haystack
---

Imagine standing in front of a buffet with over 1200 dishes. Sounds amazing, right? Now imagine you only have room for ten bites, and half the dishes are just cleverly disguised sales pitches for kitchen gadgets. That’s the challenge we faced at CentML when trying to pick the [best sessions from NVIDIA’s GTC conference.](https://www.nvidia.com/gtc/session-catalog) With so many options, finding the talks that truly matter—ones aligned with our passion for efficient AI/ML systems engineering—felt like hunting for a needle in a haystack.

Traditional search tools are like handing a waiter a napkin with “AI efficiency” scribbled on it and hoping for the best. You might get a few hits if your keywords are spot-on, but you’ll still wade through vague buzzwords and promotional fluff. And even if you narrow it down, how do you rank what’s left? By gut instinct? That’s about as reliable as picking stocks based on your horoscope.

Luckily, we had a better idea: harness the reasoning power of DeepSeek R1 and [CentML’s serverless platform](https://centml.ai/platform/) to build an agentic workflow. This system filters out the noise and ranks the gems, all with minimal human grunt work. In this post, we’ll walk you through how we did it—step by step—so you can tweak it to find your own GTC favorites or adapt it to sift through any mountain of data. Let’s get started\!

**Note**, If you just want to check out our picks, [jump to the end](#bookmark=id.m08wpioe0lyb).

# Filtering Sessions

Before we could rank anything, we had to trim the fat. Comparing all 1200+ sessions would take forever, even with a slick serverless setup. So, we built a filter to ditch the irrelevant ones upfront, leaving us with a leaner list to work with.

We turned to [DeepSeek R1](https://app.centml.com/create/rag), a reasoning model that’s great at playing “keep or toss” with conference sessions. The trick? A well-crafted prompt that tells it exactly what we’re after: talks about optimizing AI/ML systems themselves—not using AI to solve unrelated problems like curing hiccups.

Here’s the system prompt that sets the stage:  
python

```python
FILTER_SYSTEM_PROMPT = """You are an expert at evaluating AI/ML conference sessions, specifically focusing on identifying sessions that discuss optimizations of AI/ML systems themselves."""
```

And here’s the user prompt that does the heavy lifting:  
python

````python
FILTER_USER_PROMPT_TEMPLATE = """
Analyze the following GTC session title and abstract. Determine if it meets MANY of the following criteria for inclusion:

**Core Focus**: The session must explicitly address technical methods for optimizing the computational efficiency of AI/ML systems themselves. This includes:
- Reducing computational costs (e.g., energy, hardware, cloud expenses) of AI/ML models or training processes.
- Improving efficiency (e.g., faster training, optimized inference, reduced latency, smaller models).
- Techniques such as quantization, pruning, sparsity, distillation, parallelization, or novel architectures aimed at making AI/ML systems more efficient.

**Important**: The session must focus on improving the AI/ML techniques or systems, not on applying AI/ML to optimize other domains or processes.

**Technical Depth**: The session should:
- Mention frameworks/libraries (e.g., TensorFlow, PyTorch, CUDA) or tools (e.g., Triton, TensorRT) used in the optimization process.
- Describe algorithms, workflows, or provide measurable results (e.g., '40% fewer FLOPs,' '2x speedup on A100') related to AI/ML system optimization.
- Avoid vague claims (e.g., 'revolutionary,' 'industry-leading') without technical justification.

**Exclusion Rules**: Reject sessions that:
- Avoid workshop sessions, ie those that include 'Learn how to'
- Avoid session that Focus on applying AI/ML to optimize other domains or processes, rather than optimizing the AI/ML systems themselves.
- Avoid sessions that are product demos, company announcements, or partnerships without technical detail on AI/ML optimization.
- Use excessive marketing language (e.g., 'transform your business,' 'exclusive solution').
- Lack concrete methodologies for AI/ML optimization (e.g., only high-level use cases, no benchmarks).

**Examples**:
**Included**:
Title: 'Dynamic Sparsity for Efficient Transformer Training'
Abstract: 'We present a PyTorch-based method to dynamically prune attention heads during training, reducing memory usage by 35% on GPT-3-scale models without accuracy loss.'
→ Rationale: Focuses on optimizing an AI/ML system (transformer training) with technical details (pruning, PyTorch, 35% memory reduction).

**Excluded**:
Title: 'Using AI to Optimize Energy Consumption in Data Centers'
Abstract: 'Learn how our AI-powered platform can reduce energy costs by predicting and optimizing data center cooling systems.'
→ Rationale: Focuses on applying AI to optimize data center energy use, not on optimizing the AI system itself.

**Another Excluded**:
Title: 'Accelerate AI with XYZ Corporation's Cloud Platform'
Abstract: 'Discover how our industry-leading platform empowers teams to deploy models faster and cut costs!'
→ Rationale: Lacks technical details on AI/ML optimization methods; uses promotional language.

**Session to Evaluate**:
Title: ```{title}```
Abstract: ```{abstract}```

Based on the criteria above, should this session be included? Provide a brief justification.
"""
````

This setup worked like a charm—until we hit a snag. Some sessions, including a few in our top ten, were in Mandarin (that many of us don’t speak). Rather than overcomplicating the prompt to handle translations (and risk missing the nuance), we added a simple pre-filter to catch non-English text:

```python
def contains_non_english_characters(text: str) -> bool:
    """Checks if text contains non-English (non-ASCII) characters."""
    english_chars = string.ascii_letters + string.digits + string.punctuation + " "
    return any(char not in english_chars for char in text)
```

With this combo, we slashed the session list down to a manageable size, keeping only the English-language talks that fit our efficiency-focused criteria. Efficiency in action\!

# Comparing Sessions\*\*

Now that we had a filtered list, it was time to rank the survivors and find our top ten. Comparing sessions isn’t like picking your favorite pizza topping—there’s no “vibes only” option here. We needed a systematic way to pit two sessions against each other and decide a winner.

Enter DeepSeek R1 again, this time with a comparison prompt. We set it up to evaluate pairs of sessions based on what matters to us at CentML: technical depth, cost/efficiency focus, and zero tolerance for salesy nonsense. Here’s the system prompt:  
python

```py
COMPARE_SYSTEM_PROMPT = """You are an expert at comparing GTC conference sessions given their titles and abstracts."""
```

And the user prompt that drives the decision:  
python

````python
COMPARE_USER_PROMPT_TEMPLATE = """
You will analyze Titles & Abstracts of two GTC sessions (A and B) to determine which better emphasizes an academic discussions of techniques that lead to cost reduction and/or improved time/resource efficiency in AI/ML workflows, deployments, or applications. Prioritize abstacts that include evidence of concrete benefits over superficial buzz.

Template for Analysis
Step-by-Step Instructions:
Analyze Criteria for Section A - Assign scores ((1-5): Cost/Efficiency Emphasis | Avoidance of Self-Promotion | Accessibility Generality | Supported Claims.
Analyze Criteria for Section B - Same framework.
(Compare relative strengths for each criteria).
Make Final Call.
Consider:
• It must be related to AI/ML systems engineering, no using AI/ML to solve some problems such as autonomous driving, or cancer etc.
• Does A/B discuss actual financial metrics (e.g., 20%↑ inference speed) rather than ROI hype?
• If A focuses on custom ASIC chip design & B improves PyTorch pipeline design → B has wider ML impact.
VERDICT Format → {{-1 if A>B, 1 if B>=A}}: {{Return only "-1" or "1" without explanation.}}

Sessions Provided:
Title for paper a: ```{title_a}```
Abstract for paper a: ```{abstract_a}```
Title for paper b: ```{title_b}```
Abstract for paper b: ```{abstract_b}```
"""
````

To keep things consistent, we used CentML’s JSON Schema feature. This forces the model to spit out a simple 1 (B wins) or \-1 (A wins), no waffling allowed. Here’s how we wired it up:

python

```python
async def compare_sessions(api_key: str, a: Session, b: Session, prompt: Prompt) -> int:
    """Compare two sessions to determine which is more relevant."""
    key_ab = f"{a.sessionID}_{b.sessionID}"
    key_ba = f"{b.sessionID}_{a.sessionID}"

    if key_ab in cache:
        print(f"Cache hit for {a.title} vs. {b.title}")
        return cache[key_ab]
    elif key_ba in cache:
        print(f"Cache hit for {b.title} vs. {a.title}")
        return -cache[key_ba]

    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {"result": {"type": "integer", "enum": [1, -1]}},
        "required": ["result"],
        "additionalProperties": False,
    }

    user_prompt = prompt.user_prompt_template.format(
        title_a=a.title, abstract_a=a.abstract,
        title_b=b.title, abstract_b=b.abstract
    )

    print(f"Comparing {a.title} with {b.title}")
    content, reasoning = await complete_with_schema(
        api_key, "https://api.centml.com/openai/v1", schema,
        prompt.system_prompt, user_prompt, prompt.model
    )

    obj = json.loads(content)
    result = obj["result"]
    cache[key_ab] = result
    return result

cache = {}
```

This code even includes a caching trick to avoid re-comparing the same pairs—because who has time for déjà vu? With this, we built a ranked list, one head-to-head showdown at a time.

# Durable Workflows and Testing

Filtering and comparing are cool, but processing hundreds of sessions is a marathon, not a sprint. A single network glitch or bug could send us back to square one. And let’s be honest—nailing the prompts on the first try? That’s a pipe dream.

Instead of reinventing the wheel with custom retry logic, we tapped into [Temporal](https://temporal.io/), an open-source tool for durable workflows. It’s like a safety net for our process: if something crashes, Temporal picks up where we left off, no sweat.

Here’s a peek at our workflow:  
python

```python
@workflow.defn
class TopTenGTCSessionsWorkflow:
    """Workflow for fetching, filtering, and ranking GTC sessions."""
    @workflow.run
    async def run(self, workflow_input: TopTenGTCSessionsWorkflowInput) -> list[Session]:
        api_key = workflow_input.api_key
        min_sessions = []
        offset = None

        while True:
            print("fetching the next 25 sessions")
            new_sessions = await workflow.execute_activity(
                fetch_sessions, FetchSessionsInput(from_offset=offset),
                start_to_close_timeout=timedelta(seconds=30)
            )
            if not new_sessions:
                break
            offset = offset + len(new_sessions) if offset else len(new_sessions)

            english_sessions = await workflow.execute_activity(
                filter_non_english_sessions, FilterNonEnglishSessionsInput(sessions=new_sessions),
                start_to_close_timeout=timedelta(seconds=5)
            )

            filtered_sessions = await workflow.execute_activity(
                filter_sessions, FilterSessionsInput(
                    sessions=english_sessions, api_key=api_key, prompt=workflow_input.filter_prompt
                ),
                start_to_close_timeout=timedelta(seconds=300)
            )

            min_sessions = await workflow.execute_activity(
                process_sessions, ProcessSessionsInput(
                    min_sessions=min_sessions, new_sessions=filtered_sessions,
                    api_key=api_key, prompt=workflow_input.compare_prompt
                ),
                start_to_close_timeout=timedelta(seconds=600)
            )

        return min_sessions
```

We processed sessions in batches of 25, which kept data limits in check and let us peek at progress via Temporal’s slick UI:  
![][image1]

With this setup, we could easily tweak prompts on the fly with DeepSeek R1 via the [CentML Serverless Playground](https://app.centml.com/serverless/). Bug in the code? Fix it, resume, and keep rolling. It’s workflow management that doesn’t make you want to pull your hair out.

# Conclusion

So, there you have it: a workflow that filters 1200+ GTC sessions, tosses the fluff, and ranks the best based on our love for efficient AI/ML systems. But here’s the kicker—it’s not just for us. Want sessions on AI ethics or GPU hacks instead? Tweak the prompts, and you’re golden.

You can grab the full source code and a handy README [**here**](https://github.com/gflarity/codex). All it takes to run it is Python, [Temporal](https://temporal.io/setup/install-temporal-cli), and a [CentML API key](https://app.centml.com/user/vault). Play around with it, make it yours, and happy session hunting\!

# Appendix: CentML’s Top Picks for GTC Sessions

1\. [Accelerate Super Long-Context LLM Inference](https://www.nvidia.com/gtc/session-catalog/#/session/1727451588919001blpQ)  
2\. [Exploit Inter-Layer Expert Affinity for Mixture-of-Experts Model Inference](https://www.nvidia.com/gtc/session-catalog/#/session/1729799015210001EnWU)  
3\. [FlashAttention-3: Fast and Accurate Attention With Asynchrony and Low Precision](https://www.nvidia.com/gtc/session-catalog/#/session/1725825619590001romQ)

4\. [FlexAttention: The Flexibility of PyTorch With the Performance of FlashAttention](https://www.nvidia.com/gtc/session-catalog/#/session/1726184633014001Jh5G)  
5\. [Accelerate FHE-Based DNN Secure Inference With GPU](https://www.nvidia.com/gtc/session-catalog/#/session/1735908233382001ZiOa)  
6\. [Fine-Grained GPU Partitioning for Higher Performance and Energy Efficiency](https://www.nvidia.com/gtc/session-catalog/#/session/1729808937776001fv9P)  
7\. [Optimize Language Model Pre-Training With Semantic Chunking and Dynamic Concatenation](https://www.nvidia.com/gtc/session-catalog/#/session/1727866055429001fsQb)  
8\. [Accelerate Large Language Model Training with Hybrid GPU-Based Compression](https://www.nvidia.com/gtc/session-catalog/#/session/1729808018499001VCte)  
9\. [LLM Pruning and Distillation in Practice: The Minitron Approach](https://www.nvidia.com/gtc/session-catalog/#/session/1726123727276001YMM7)\</a\>  
10\. [RocketKV: Accelerate Long-Context LLM Inference via Two-stage KV Cache Compression](https://www.nvidia.com/gtc/session-catalog/#/session/1736560799965001D3FC)

(Originally posted on the now defunct CentML blog.)
