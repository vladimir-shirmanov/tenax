# Design Handoff Batch Template

Use this template for every design artifact batch produced by `Design Handoff`.

## Detail Level
- Default detail level: `standard`
- `standard` means the batch is specific enough for a frontend implementation agent to execute without inventing missing structure, but does not expand into production code.

## Required Fields
```yaml
batch: 1
title: "Home page visual direction"
detail_level: "standard"
objective: "Define the first-impression layout, hierarchy, and tone"
deliverables:
  - "Section order and content priority"
  - "Style tokens: color, type, spacing, surfaces"
  - "Interaction notes for primary and secondary actions"
acceptance_criteria:
  - "Visual hierarchy is explicit"
  - "Responsive intent is defined for mobile and desktop"
  - "Frontend implementation can proceed without guessing the page structure"
dependencies:
  - "Brand voice"
  - "Confirmed core CTA"
visual_direction:
  mood: "Calm, focused, premium"
  references:
    - "Editorial learning product"
  constraints:
    - "Avoid generic SaaS hero patterns"
layout_blueprint:
  - "Hero with concise value proposition and primary CTA"
  - "Trust strip or proof section"
  - "Feature explanation blocks"
  - "Closing CTA"
style_tokens:
  color:
    - "Background, surface, accent, text, border"
  typography:
    - "Display, heading, body, label roles"
  spacing:
    - "Section rhythm and component density"
  shape:
    - "Corner radius and container treatment"
interaction_notes:
  - "Hover/focus behavior for CTA"
  - "Scroll reveal or motion intent where relevant"
responsive_notes:
  - "How layout compresses on small screens"
  - "Priority rules for stacking and content trimming"
content_notes:
  - "Headline tone"
  - "Button copy"
accessibility_checklist:
  - "Clear heading hierarchy is defined"
  - "Interactive states include focus visibility expectations"
  - "Color usage preserves readable contrast intent"
  - "Motion guidance includes reduced-motion fallback when motion is specified"
  - "Content structure remains understandable when layouts stack on mobile"
frontend_handoff:
  - "Implement the section structure in the listed order"
  - "Apply the token set and interaction rules as specified"
  - "Do not improvise missing sections without returning for design clarification"
open_questions:
  - "Is social proof available?"
```

## Notes
- Keep wording implementation-ready, not abstract.
- When a batch includes motion, always include reduced-motion intent.
- When a batch includes color direction, define contrast expectations even if exact ratios are not specified.
- If information is unknown, list it under `open_questions` instead of guessing.