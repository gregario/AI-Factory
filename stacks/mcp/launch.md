# Launch & Community Promotion — MCP Server

This file exists because of a painful lesson: deploying to the Godot subreddit too early, with AI-written copy, in a community that is actively hostile to AI tooling. The backlash was immediate and angry.

**MCP servers are developer tools that touch on AI — a politically charged topic in many communities.** This file provides a pragmatic, adversarial checklist for launching without getting burned.

---

## The Core Lesson

Not every community wants your tool. Not every community is ready for AI tooling. Not every community should hear about your MCP server at all.

**Before promoting anywhere, you must answer three questions:**

1. **Does this community want AI tooling?** (Check recent threads, sentiment, mod policies)
2. **Do I have standing in this community?** (Are you a known contributor, or a stranger dropping links?)
3. **Is my post clearly human-written?** (AI-generated promotional posts get flagged instantly in hostile communities)

If any answer is "no", don't post. It's that simple.

---

## Community Sentiment Assessment

Before posting to any community, do this research:

### Check for hostility signals

- [ ] Search the subreddit/forum for "AI" and "MCP" — read the top 5 recent threads
- [ ] Check if the community has explicit rules about AI content
- [ ] Look for mod statements or pinned posts about AI policy
- [ ] Check if project maintainers have publicly stated positions on AI
- [ ] Look for recent drama or incidents involving AI tooling

### Classify the community

| Sentiment | Examples | Approach |
|-----------|----------|----------|
| **Enthusiastic** | r/ClaudeCode, AI dev communities | Lead with MCP, be technical, demo-driven |
| **Neutral-positive** | Hacker News, Twitter/X, LinkedIn | Lead with design decisions, differentiate |
| **Neutral-sceptical** | r/gamedev, general programming subs | Don't lead with "AI", focus on the problem solved |
| **Hostile** | r/godot, Godot forums, communities with AI bans | **Do not post** unless you have genuine community standing |

### Hard gates — DO NOT POST if:

- The community has an explicit AI content ban or flag system
- Project maintainers have publicly denounced AI tooling
- You have zero post history in that community
- Your post was written by an AI (even if edited)
- The community is in active "AI slop" crisis mode

---

## Posting Order

Always start with your friendliest audience and work outward. Feedback from each post informs the next.

1. **Your users** (r/ClaudeCode, MCP-specific communities) — home crowd
2. **Technical generalists** (Hacker News Show HN) — lead with design decisions
3. **Social media** (Twitter/X, LinkedIn) — short, visual, link-driven
4. **Adjacent communities** (r/programming, domain-specific subs) — only if sentiment allows
5. **Domain-specific hostile communities** — last, only if you've earned standing, handwritten only

Space posts 1–2 days apart. Don't carpet-bomb everything on day one.

---

## Post Writing Checklist

For each community, before posting:

- [ ] I have read 5+ recent threads about AI in this community
- [ ] I understand the community's current AI sentiment
- [ ] I have checked for explicit AI content policies
- [ ] My post is tailored to this community's culture (not copy-pasted)
- [ ] My post leads with the **problem**, not the technology
- [ ] My post does not evangelise AI — it describes a tool that solves a problem
- [ ] For hostile communities: **I wrote this entirely myself, in my own voice**
- [ ] For hostile communities: **I have a post history in this community**
- [ ] I'm prepared for pushback and won't get defensive

---

## Post Templates by Sentiment

### For enthusiastic communities

Lead with MCP, be technical, show the tools:
```
Built an MCP server for [domain]. [Tool count] tools:
- [Tool 1] — [what it does]
- [Tool 2] — [what it does]

[One-line install command]

Looking for feedback: [specific question]

[GitHub link]
```

### For neutral communities

Lead with design decisions and differentiation:
```
[Problem statement — what's broken without this tool]

I looked at [N] existing solutions. [Why they didn't work].

Built [tool name] with [key differentiator]:
- [Design decision 1 and why]
- [Design decision 2 and why]

[GitHub link]
```

### For sceptical communities

Lead with the problem, barely mention AI:
```
If you use any coding assistant with [tool/language], you've probably hit this:
[specific problem description]

I built an open source tool that [solves the specific problem].

[GitHub link]
```

### For hostile communities

**Write it yourself.** Do not use AI to draft this. Keep it to 3–4 sentences:
```
I'm building [project] in [tool]. Hit [specific problem].
Built [tool name] to fix it — [one sentence description].
[GitHub link]
```

---

## Handling Backlash

When you get pushback (and you will):

- **Don't get defensive.** Thank people for feedback, even hostile feedback.
- **Don't argue about AI ethics.** You won't change minds in a Reddit thread.
- **Answer technical questions directly.** Focus on what the tool does, not what AI is.
- **If the thread turns toxic, disengage.** Delete the post if needed. Your reputation matters more than one launch.
- **Fold valid criticism into the product.** If people point out real problems, fix them.

---

## Launch Definition of Done

A launch is complete when:

- [ ] npm published (see `publishing.md`)
- [ ] Listed on Glama, MCP Registry, awesome-mcp-servers
- [ ] Posted to at least 2 communities (starting with friendliest)
- [ ] Community sentiment research documented in `docs/launch-posts.md`
- [ ] Posts tailored per community (not copy-pasted)
- [ ] For any hostile community: post is handwritten, poster has community standing
- [ ] Feedback from early posts folded into README/tool descriptions
- [ ] GitHub repo has clear README with one-line install

---

## Anti-Patterns

| Anti-Pattern | What Happens |
|---|---|
| Carpet-bombing all communities on day one | Looks spammy, no time to incorporate feedback |
| Same post everywhere | Gets flagged as spam, ignores community culture |
| AI-written post in hostile community | Immediately flagged, credibility destroyed |
| Posting where you have no history | "Who is this person dropping links?" — ignored or hostile |
| Leading with "AI" in sceptical communities | Triggers reflexive downvotes before anyone reads |
| Arguing about AI in the comments | Wastes energy, never convinces anyone |
| Evangelising instead of problem-solving | People want solutions, not ideology |
