## 2026-08-03 - [Cursor Performance & Layout Thrashing]
**Learning:** Calling `getComputedStyle` and performing DOM ancestor walking inside a synchronous `mousemove` event handler on every pixel of movement triggers severe performance penalties and potential layout thrashing / layout-forcing, which makes cursor tracking stutter.
**Action:** Cache the hovered DOM element target. If the current event's target matches the last evaluated target, short-circuit immediately. This reduces operations from once per `mousemove` pixel to only once per element transition.
