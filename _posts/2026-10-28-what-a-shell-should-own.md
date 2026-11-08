---
title: What a shell should own.
description: A narrow article is a different composition, even on the same screen.
author: The design workshop
tags: [Design, Publishing]
---
## The frame

A website shell should own the recurring relationships: the site identity, navigation, masthead, reading measures, and footer. A page supplies its subject, metadata, and content.

This article begins directly with its reading content. Krigsvold does not add a contents index by default. An author may write section links inline when they help a particular document.

## The reading

A date and an author belong with the title. Tags describe the article. They are not loose paragraphs dropped between the masthead and the opening sentence.

The main text begins below the masthead. It has enough room for a sustained thought, without stretching each line across the full screen.

## The contract

Jekyll renders the page before it reaches the browser. The shared CSS still recognizes the same masthead, container, heading, and footer classes. That is the abstraction being tested here.

```html
<header class="page-intro">
  <div class="page-intro__shade">
    <div class="container page-intro__content">…</div>
  </div>
</header>
```

The markup above illustrates the Martlet masthead; Krigsvold uses its own `page-masthead` hierarchy. Shared concepts do not require identical family markup.
