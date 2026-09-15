// Renders docs/copy/COPY-REVIEW-TOOL.md — the single file handed to the
// founder. It is deliberately self-contained: the founder's agent needs no
// repo access, only this file.

const FIELD_LABELS = {
  heading: 'Heading',
  body: 'Paragraph',
  button: 'Button',
  link: 'Link',
  label: 'Small label',
  price: 'Price',
  'price-unit': 'Price unit',
  'list-item': 'List item',
  'image-alt': 'Image description (not visible — read by screen readers and Google)',
  'seo-title': 'Browser tab + Google result title',
  'seo-description': 'Google result description',
  'seo-phrase': 'Search phrase',
  text: 'Text',
};

// Turns source text into something a non-technical reader can parse.
function readable(src) {
  return src
    .replace(/<br\s*\/?>/gi, ' ⏎ ')
    .replace(/<\/?(em|strong|b|i|u|small|sup|sub|mark)\b[^>]*>/gi, '')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

const hasMarkup = (s) => /<[a-z]/i.test(s);

export function renderTool(inv) {
  const editable = inv.entries.filter((e) => !e.duplicateOf);

  // group: page -> section -> entries, preserving inventory order
  const pages = new Map();
  for (const e of editable) {
    if (!pages.has(e.page)) pages.set(e.page, new Map());
    const sections = pages.get(e.page);
    if (!sections.has(e.section)) sections.set(e.section, []);
    sections.get(e.section).push(e);
  }

  const orderedPages = [
    ...inv.pageOrder.filter((p) => pages.has(p)),
    ...[...pages.keys()].filter((p) => !inv.pageOrder.includes(p)),
  ];

  const out = [];
  const w = (s = '') => out.push(s);

  /* ------------------------------------------------------------- preamble */

  w('# Not The Rug — Website Copy Review');
  w();
  w(`Generated ${inv.generatedAt} from the live site code · **${editable.length} pieces of copy**`);
  w();
  w('This file lists **every word currently on the Not The Rug website**, organised page by page.');
  w('It exists so you can read the site as a document, confirm that everything it says is accurate,');
  w('and send any corrections back in a form the developer can apply automatically.');
  w();
  w('---');
  w();
  w('## How to use this');
  w();
  w('1. Open this file with your AI assistant (Claude, ChatGPT, whichever you use). Upload it as a file rather than pasting it.');
  w('2. Tell it: **"Read this file and walk me through the website copy section by section."**');
  w('3. It will read you each piece of copy and ask if it is accurate. Say **yes**, or tell it what is wrong.');
  w('4. If something bothers you but you are not sure what it should say, just say so — it gets noted for the developer.');
  w('5. When you are done, tell it: **"Produce the final change list."**');
  w('6. Send the developer the block it produces. That is the whole handoff.');
  w();
  w('You do not have to review everything in one sitting, and you do not have to review everything at all.');
  w('Anything you say nothing about stays exactly as it is.');
  w();
  w('**If you only have twenty minutes**, review the Home page, Services & Rates, and Contact sections.');
  w('Those carry the pricing, the claims and the contact details — the things most likely to be out of date.');
  w();
  w('### What is in here');
  w();
  {
    let n = 0;
    for (const page of orderedPages) {
      n += 1;
      const count = [...pages.get(page).values()].reduce((a, b) => a + b.length, 0);
      w(`${n}. **${inv.pageTitles[page] || page}** — ${count} item${count === 1 ? '' : 's'}`);
    }
  }
  w();
  w('---');
  w();

  /* ------------------------------------------------------ agent guardrails */

  w('## Instructions for the AI assistant');
  w();
  w('**Read this section fully before responding to the founder.**');
  w();
  w('You are walking the founder of Not The Rug through the copy on his existing website so he can');
  w('confirm it is accurate. You are a careful reader and a note-taker. You are **not** a copywriter,');
  w('an editor, or a marketing advisor, and the wording of the site is not under review — only whether');
  w('what it says is true and current.');
  w();
  w('### The one question you ask');
  w();
  w('For every piece of copy: **"Is this accurate?"** — meaning: are the facts right, is anything out of');
  w('date, is anything no longer true. That is the whole check.');
  w();
  w('You do not ask whether he likes it, whether it sounds like him, how he would phrase it, what he wants');
  w('to emphasise, or whether it could be stronger. You do not offer opinions on the copy, and you never');
  w('suggest alternative wording for something he has confirmed is accurate.');
  w();
  w('### Two kinds of response, handled differently');
  w();
  w('**A correction** — he tells you a fact is wrong and what the right value is (a price, a name, a year,');
  w('a service that changed, an address). Record it as a change: same sentence, same words, only the wrong');
  w('fact swapped for the right one. Show him the before/after once and move on.');
  w();
  w('**A concern** — he says something bothers him, does not sit right, is not how he would put it, or he');
  w('is not sure what it should say. Do **not** try to solve it. Do not draft options, do not ask him to');
  w('workshop it. Write down what he said, in his words, against that item\'s id, and move on. Those go');
  w('in a separate notes list for the developer at the end. Say something like: *"Noted — I\'ll flag that');
  w('for the developer."* and continue.');
  w();
  w('If he starts working on wording himself and gives you exact replacement text he wants, that is a');
  w('correction — record it as given. If he is thinking out loud, that is a concern — note it and keep going.');
  w();
  w('### Hard rules');
  w();
  w('1. **Every item in this file has an `id`. You may only ever refer to ids that appear in this file.**');
  w('   If you output an id that is not in this file, the developer\'s tooling will reject the whole change list.');
  w('2. **Never invent new copy slots.** You cannot add a new section, a new heading, a new bullet, a new');
  w('   service card, a new team member, a new FAQ question, a new review, or a new button. The website has a');
  w('   fixed set of copy slots and this file is the complete list of them.');
  w('3. **Never delete a copy slot.** Every id must keep some text. If the founder wants something removed from');
  w('   the site, do not blank it — write `"REMOVE-REQUEST"` in the notes field for that id and let the');
  w('   developer handle it as a code change.');
  w('4. **Only change what the founder says is wrong.** Silence means keep. A change only exists once he has');
  w('   given you the correct value or the exact text he wants.');
  w('5. **Never guess a fact.** Prices, years in business, review counts, certifications, insurance claims,');
  w('   phone numbers and hours are factual. If he says a value is wrong but does not give the new one, ask');
  w('   for it. If he does not know, leave the item alone and note it as a concern.');
  w('6. **Copy the `current` text back verbatim.** Your change list must echo the existing text exactly as it');
  w('   appears in this file, character for character, including any `<br />`, `<em>` or `&apos;` bits. The');
  w('   developer\'s tooling uses that to confirm it is editing the right thing. If it does not match, the');
  w('   change is rejected.');
  w('7. **Respect the length of the slot.** These are real positions in a real layout. Keep a correction about');
  w('   the same length as what it replaces. If it genuinely needs to be much longer, say so in `notes`.');
  w();
  w('### How to run the session');
  w();
  w('Work through the file in the order it is written. For each section:');
  w();
  w('- Read the founder the copy in that section in plain language (use the **Reads as** line, not the raw text).');
  w('- Ask: *is this accurate — anything wrong or out of date?*');
  w('- If yes, move on. If he gives a correction, record it. If he raises a concern, note it.');
  w('- Do not batch up twenty questions at once. A few items at a time is fine; a whole page at once is not.');
  w();
  w('Things worth double-checking as you go, because they go stale:');
  w();
  w('- **Prices** — are these current, including tax handling?');
  w('- **Numbers** — years in business, review counts, dogs per walk, response times.');
  w('- **Claims** — insurance, bonding, certifications, background checks. Only what is actually true today.');
  w('- **Contact details** — phone, email, hours, address, service area.');
  w('- **Team** — names, roles and bios of the people currently working there.');
  w('- **Services** — everything listed is still offered; nothing offered is missing a price.');
  w();
  w('No preamble about what a section is for, no commentary on the copy, no summaries of how it reads.');
  w();
  w('### Formatting the replacement text');
  w();
  w('- Plain text is fine. If the current text contains `<br />`, that is a line break in the design — keep it');
  w('  in the same place.');
  w('- If the current text contains `<em>...</em>`, that word is visually emphasised in the design. Keep it');
  w('  on the same word.');
  w('- Do not worry about apostrophes or quote marks. Write them normally; the developer\'s tooling converts them.');
  w('- `⏎` in a **Reads as** line just marks where a line break falls. Do not type that character.');
  w();

  /* --------------------------------------------------------- output format */

  w('### The change list you must produce at the end');
  w();
  w('When the founder says he is done, output **one fenced JSON code block**, then (only if there are any)');
  w('a `## Founder notes` section. Nothing else after those.');
  w();
  w('```json');
  w('{');
  w('  "reviewedBy": "Luis",');
  w('  "reviewedOn": "YYYY-MM-DD",');
  w('  "sourceGeneratedAt": ' + JSON.stringify(inv.generatedAt) + ',');
  w('  "changes": [');
  w('    {');
  w('      "id": "services.services-grid.price-33",');
  w('      "current": "$33",');
  w('      "new": "$35",');
  w('      "notes": "Price went up in June"');
  w('    }');
  w('  ]');
  w('}');
  w('```');
  w();
  w('Rules for that block:');
  w();
  w('- Include **only** items that are actually changing. Leave everything else out entirely.');
  w('- `id` must be copied exactly from this file.');
  w('- `current` must be copied exactly from this file.');
  w('- `new` is the corrected text.');
  w('- `notes` is optional, one short line, for anything the developer needs to know.');
  w('- Valid JSON. No trailing commas, no comments inside the block.');
  w('- If nothing is changing, output the block with `"changes": []`.');
  w();
  w('Then the notes section, one line per item, in this shape:');
  w();
  w('```');
  w('## Founder notes');
  w();
  w('- `home.hero.not-the-rug-is-williamsburg` — Not sure "most trusted" is something we can say. Wants to think about it.');
  w('- `about.about-team.reana` — Reana is now part-time, bio may need updating. Didn\'t have new wording.');
  w('- (no id) — Would like a photo of the new van on the About page.');
  w('```');
  w();
  w('Concerns tied to a specific piece of copy carry its id. Anything that is not about an existing piece of');
  w('copy — a new section, a page that does not exist, a design change, a photo — goes in the same list');
  w('marked `(no id)`. Never force any of these into the JSON change list.');
  w();
  w('---');
  w();

  /* ------------------------------------------------------------- the copy */

  w('## The copy');
  w();
  w('Each item shows its **id** (used by the developer\'s tooling), what kind of element it is,');
  w('the exact text in the code, and how it reads on the page.');
  w();

  let pageNo = 0;
  for (const page of orderedPages) {
    pageNo += 1;
    const sections = pages.get(page);
    const count = [...sections.values()].reduce((n, a) => n + a.length, 0);
    w('---');
    w();
    w(`## ${pageNo}. ${inv.pageTitles[page] || page}`);
    w();
    w(`_${count} item${count === 1 ? '' : 's'}_`);
    w();

    for (const [, entries] of sections) {
      const first = entries[0];
      w(`### ${first.sectionTitle}`);
      w();
      if (first.sectionNote) {
        w(`> ${first.sectionNote}`);
        w();
      }
      for (const e of entries) {
        const label = FIELD_LABELS[e.field] || 'Text';
        const reads = readable(e.current);
        w(`**\`${e.key}\`** — ${label}`);
        w();
        w('```text');
        w(e.current);
        w('```');
        w();
        if (hasMarkup(e.current) || reads !== e.current) {
          w(`Reads as: ${reads}`);
          w();
        }
        if (e.occurrences > 1) {
          w(`_Written ${e.occurrences} times in this section by design (the strip loops). One edit updates all of them._`);
          w();
        }
        if (e.alsoAt && e.alsoAt.length) {
          w(`_The same wording is used elsewhere: ${e.alsoAt.map((k) => '`' + k + '`').join(', ')}. Those are separate slots — change them too if they should stay consistent._`);
          w();
        }
        if (e.note) {
          w(`_${e.note}_`);
          w();
        }
      }
    }
  }

  w('---');
  w();
  w('## What this file cannot change');
  w();
  w('These are real requests — they just are not copy edits, so they go in the');
  w('`## Requests that need a developer` block instead:');
  w();
  w('- Adding or removing a section, page, service card, team member, FAQ question or review');
  w('- Changing photos, illustrations, colours, fonts, layout or animation');
  w('- Changing what a button does, where a link goes, or how the booking form works');
  w('- Anything about pricing logic, scheduling, or the admin dashboard');
  w();
  w('---');
  w();
  w(`_Generated by \`${inv.generator}\` on ${inv.generatedAt}. If the website code changes, regenerate this file rather than editing it by hand._`);
  w();

  return out.join('\n');
}
