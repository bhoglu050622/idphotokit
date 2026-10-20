/**
 * Unique copy for the background-removal pages. Claims about remove.bg are only
 * sentences published on remove.bg itself, with the page linked beside them.
 */

const faqLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map(item => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a }
  }))
});

const howToLd = (name, steps) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  step: steps.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step.name,
    text: step.text
  }))
});

const faqHtml = (items) => items.map(item => `<h3>${item.q}</h3><p>${item.a}</p>`).join("\n");
const stepsHtml = (steps) => `<ol>${steps.map(step => `<li><strong>${step.name}.</strong> ${step.text}</li>`).join("")}</ol>`;

const toolSteps = [
  { name: "Add the photo", text: "Drop a JPG, PNG or WebP onto the page, choose a file, or use the phone camera." },
  { name: "Choose people or product", text: "People keeps a softer edge for hair. Product tightens the matte and can place the object on a white square." },
  { name: "Wait for the model once", text: "The first cutout downloads about 94 MB from Hugging Face and caches it in the browser. The photo itself is not uploaded." },
  { name: "Download the free PNG", text: "Transparent, white, a custom colour, or the square white listing preset. The long side is at most 1000 pixels and there is no watermark." }
];

const removerFaq = [
  {
    q: "Does the photo get uploaded?",
    a: "No. The cutout runs in this browser tab. The only download is the background-removal model, the first time you use the tool."
  },
  {
    q: "How large is the free file?",
    a: "The long side is capped at 1000 pixels. A larger original is reduced before the cutout. There is no watermark and no paid download."
  },
  {
    q: "What if the phone cannot run the model?",
    a: "The page says so. Phones that report 2 GB of memory or less may be slow or run out of memory. Closing other tabs, or using a desktop browser, is the fallback. There is no server to send the photo to instead."
  }
];

const alternativeFaq = [
  {
    q: "Is the remove.bg website shutting down?",
    a: "remove.bg's own homepage says its background removal is moving to Canva and that the standalone website will no longer be available from 1 December 2026 at 9:00am CET. Their API page says that starting 1 December 2026, background removal moves to Leonardo.Ai, also part of Canva."
  },
  {
    q: "Is PhotoJhat a copy of remove.bg?",
    a: "No. PhotoJhat runs an MIT-licensed BiRefNet lite model in the browser. It does not use remove.bg's service, API, or account. The free file stops at 1000 pixels on the long side."
  },
  {
    q: "Do I need credits here?",
    a: "No. There is no account and no credit balance. HD and batch export are marked coming soon because they are not built, not because a payment is required."
  }
];

const indiaFaq = [
  {
    q: "What does this cost in rupees?",
    a: "The cutout costs ₹0. The model runs on your phone or computer, so PhotoJhat does not pay a per-image API fee and does not charge one."
  },
  {
    q: "Can I use it for a Meesho listing?",
    a: "You can make a square white PNG with the product centred. Meesho's public catalogue lesson asks for a sharp, clear front image as a JPEG, without a logo, watermark, partial view or prop. Confirm the current image rules in the Supplier Panel before you upload. PhotoJhat's square is its own preset, not Meesho's specification."
  },
  {
    q: "Is this the passport-photo tool?",
    a: "No. Passport, PAN, visa and exam files are separate tools. This page only removes a background."
  }
];

const marketplaceFaq = [
  {
    q: "Does Meesho require a white background?",
    a: "Meesho's public lessons do not say that. They ask for a sharp, clear front image, JPEG, with no logo or watermark, and for clothes they say not to use a partial view or a prop. The Supplier Panel holds the detailed image rules. The white square here is PhotoJhat's preset."
  },
  {
    q: "Will Amazon or Flipkart accept this file?",
    a: "Check the listing form you are using. This page does not quote a pixel size from Amazon or Flipkart, because those seller rules were not copied into this page. The file is square, white #FFFFFF, and at most 1000 pixels on a side."
  },
  {
    q: "Why is the download a PNG?",
    a: "PNG keeps the white at exactly #FFFFFF. A JPEG can shift white a little. If a form insists on JPEG, export or convert the PNG after you have checked the white."
  }
];

export function backgroundPages() {
  return [
    {
      path: "/background-remover",
      title: "Remove a background in your browser | PhotoJhat",
      description: "Remove a portrait or product background in the browser. Free PNG up to 1000 pixels, no watermark, and the photo is not uploaded.",
      jsonLd: (url) => [
        faqLd(removerFaq),
        howToLd("Remove a background in PhotoJhat", toolSteps),
        { "@context": "https://schema.org", "@type": "WebApplication", name: "PhotoJhat background remover", url, applicationCategory: "PhotographyApplication", operatingSystem: "Any browser", offers: { "@type": "Offer", price: "0", priceCurrency: "INR" } }
      ],
      body: `<section class="countryDoc"><div class="countryDocInner">
        <h2>How to remove a background</h2>
        <p>Use the tool above. It accepts a JPG, PNG or WebP from a file, a drag-and-drop, or the phone camera. People mode keeps a softer edge. Product mode tightens the cut and can centre the object on white.</p>
        ${stepsHtml(toolSteps)}
        <h2>What the free download includes</h2>
        <p>The PNG is capped at 1000 pixels on the long side, including the square white preset. There is no watermark. HD and batch export are labelled coming soon because they are not available; there is no payment form on this page.</p>
        <h2>Questions</h2>
        ${faqHtml(removerFaq)}
        <p class="countryDocNote">The model is BiRefNet lite, MIT licensed. The weights download from <a href="https://huggingface.co/studioludens/birefnet-lite-512">Hugging Face</a> when you start a cutout. See the README for the copyright notice.</p>
      </div></section>`
    },
    {
      path: "/remove-bg-alternative",
      title: "A browser alternative while remove.bg moves to Canva | PhotoJhat",
      description: "Compare PhotoJhat's in-browser cutout with what remove.bg publishes about its December 2026 move to Canva. Free up to 1000 pixels, no upload.",
      jsonLd: (url) => [faqLd(alternativeFaq), howToLd("Make a cutout without uploading it", toolSteps), { "@context": "https://schema.org", "@type": "WebPage", name: "remove.bg alternative", url }],
      body: `<section class="countryDoc"><div class="countryDocInner">
        <h2>What remove.bg has published</h2>
        <p>The banner on <a href="https://www.remove.bg/">remove.bg</a> says its background removal is moving to <a href="https://www.canva.com/features/background-remover/">Canva</a>, and that the standalone website will no longer be available from 1 December 2026 at 9:00am CET. The same banner points to the <a href="https://www.remove.bg/faq">remove.bg FAQ</a> and the updated terms. The <a href="https://www.remove.bg/api">API page</a> says that starting 1 December 2026, background removal moves to Leonardo.Ai, also part of Canva.</p>
        <p>On the <a href="https://www.remove.bg/pricing">pricing page</a>, remove.bg says credits are for full-resolution cutouts and that removing the background from one image requires one credit. Preview images are free on remove.bg. Those are their rules, and the prices next to the credits can change, so read that page for the current packs.</p>
        <h2>How this page differs</h2>
        <table class="specTable"><caption>Published differences, not a ranking</caption><tbody>
          <tr><th scope="row">Where the cutout runs</th><td>In your browser on PhotoJhat. The image is not sent to PhotoJhat.</td></tr>
          <tr><th scope="row">Price of a download</th><td>₹0, up to 1000 pixels on the long side, with no watermark. HD and batch are not offered.</td></tr>
          <tr><th scope="row">remove.bg full-resolution file</th><td>Their pricing page says one image requires one credit. Previews are free.</td></tr>
          <tr><th scope="row">After 1 December 2026</th><td>remove.bg says the standalone site will not be available from 9:00am CET that day. This PhotoJhat page does not depend on that site.</td></tr>
          <tr><th scope="row">Account</th><td>None here. remove.bg uses its own account and credits.</td></tr>
        </tbody></table>
        <h2>Make a cutout here</h2>
        ${stepsHtml(toolSteps)}
        <h2>Questions</h2>
        ${faqHtml(alternativeFaq)}
      </div></section>`
    },
    {
      path: "/remove-bg-alternative-free-india",
      title: "Free background remover in India, in the browser | PhotoJhat",
      description: "A ₹0 background remover for portraits and product photos in India. The image stays on your device. Up to 1000 pixels, no watermark.",
      jsonLd: (url) => [faqLd(indiaFaq), howToLd("Remove a background for free in India", toolSteps), { "@context": "https://schema.org", "@type": "WebPage", name: "Free background remover in India", url }],
      body: `<section class="countryDoc"><div class="countryDocInner">
        <h2>A ₹0 cutout for a phone you already have</h2>
        <p>This page is for someone in India who needs a background removed and does not want to buy credits or upload the picture. The model runs on the device. PhotoJhat does not charge, because there is no per-image server cost. The free PNG stops at 1000 pixels on the long side.</p>
        <p>It is not the <a href="/photo/india">Indian passport</a> tool and not the <a href="/exam">exam photo resizer</a>. Those pages set print size, head height and file-size limits. This page only separates a person or a product from the background.</p>
        <h2>What you still check yourself</h2>
        <ul>
          <li>Hair and thin straps can be soft. Look at the preview before you download.</li>
          <li>A busy cloth background behind a similar-coloured product is harder than a plain wall.</li>
          <li>A phone that reports 2 GB of memory or less may fail. The page says so instead of uploading the photo.</li>
        </ul>
        <h2>Steps</h2>
        ${stepsHtml(toolSteps)}
        <h2>Questions</h2>
        ${faqHtml(indiaFaq)}
        <p>remove.bg's homepage says the standalone website will no longer be available from 1 December 2026 at 9:00am CET, with background removal moving to Canva. That statement is theirs: <a href="https://www.remove.bg/">remove.bg</a>.</p>
      </div></section>`
    },
    {
      path: "/white-background-for-meesho-amazon",
      title: "White background for a Meesho, Amazon or Flipkart photo | PhotoJhat",
      description: "Make a square white product photo in the browser. PhotoJhat's preset is #FFFFFF with the product centred. Confirm each marketplace's own image rules.",
      jsonLd: (url) => [faqLd(marketplaceFaq), howToLd("Make a square white product photo", [
        { name: "Photograph the product", text: "Use a clear front view. Meesho's catalogue lesson for clothes asks for a sharp front image and says not to include a prop." },
        { name: "Choose Product / object", text: "The product mode tightens the edge and finds the object." },
        { name: "Choose the square preset", text: "The Meesho / Amazon / Flipkart option makes a square PNG, fills it with #FFFFFF, and centres the product with padding." },
        { name: "Check the listing form", text: "Meesho says detailed image guidelines are in the Supplier Panel. Confirm Amazon or Flipkart in the seller account you are using." }
      ])],
      body: `<section class="countryDoc"><div class="countryDocInner">
        <h2>A white square you can check</h2>
        <p>Choose Product / object, then “Meesho / Amazon / Flipkart square”. The download is a square PNG. The area outside the product is #FFFFFF, and the product sits in the middle with padding. The long side is at most 1000 pixels.</p>
        <p>This preset is PhotoJhat's, for a clean listing photo. It is not a claim that Meesho, Amazon or Flipkart require these pixels.</p>
        <h2>What Meesho publishes</h2>
        <p>Meesho's lesson on <a href="https://supplier.meesho.com/learning-hub/lessons/how-to-list-your-catalog-using-single-upload">listing a catalogue</a> says to add a sharp, clear image of the front of the product. The clothes and shirt pages say to upload JPEG images without a logo or watermark, and not to use a partial product image or a prop. <a href="https://supplier.meesho.com/how-it-works">How to sell on Meesho</a> says the detailed image guidelines are in the Supplier Panel. Read that panel for the catalogue you are uploading.</p>
        <h2>Amazon and Flipkart</h2>
        <p>This page does not quote an Amazon or Flipkart pixel size. Seller image rules live in the account you list with, and they change. Use the white square as a starting file, then match the form in front of you.</p>
        <h2>Steps</h2>
        ${stepsHtml([
          { name: "Photograph the product", text: "A clear front view on a plain background gives the model an easier edge." },
          { name: "Select Product / object", text: "People mode is for hair and shoulders, not for a parcel or a garment laid flat." },
          { name: "Download the square PNG", text: "White is #FFFFFF. Convert to JPEG afterwards if the listing form rejects PNG." }
        ])}
        <h2>Questions</h2>
        ${faqHtml(marketplaceFaq)}
      </div></section>`
    }
  ];
}
