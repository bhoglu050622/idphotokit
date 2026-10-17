/**
 * Indian government exam photo and signature limits.
 *
 * Every figure is taken from the notice linked on that exam. A pixel size that
 * the notice does not print is marked `pixelsVerified: false` and is not treated
 * as official. Kilobyte ranges are in decimal KB as the notices write them
 * (1 KB = 1024 bytes when the file is checked).
 */

export type LiveCapture = {
  kind: "live";
  guidance: string;
};

export type UploadSpec = {
  kind: "upload";
  label: string;
  /** Absent when the notice does not state pixels. */
  width?: number;
  height?: number;
  pixelsVerified: boolean;
  pixelNote: string;
  minKB: number;
  maxKB: number;
  kbVerified: boolean;
  fit: "cover" | "contain";
  background: string;
  formatNote: string;
};

export type Exam = {
  slug: string;
  name: string;
  shortName: string;
  authority: string;
  cycle: string;
  sourceUrl: string;
  sourceTitle: string;
  /** The date the notice itself gives, ISO 8601. */
  sourceDate: string;
  sourceDateMeaning: string;
  photo: LiveCapture | UploadSpec;
  signature: UploadSpec;
  rejections: string[];
  faq: { q: string; a: string }[];
  noticePoints: string[];
};

const jpeg = "JPEG / JPG, as the notice asks. This tool writes a JPEG.";

export const EXAMS: Exam[] = [
  {
    slug: "ssc-cgl",
    name: "SSC CGL",
    shortName: "SSC CGL",
    authority: "Staff Selection Commission",
    cycle: "Combined Graduate Level Examination, 2026",
    sourceUrl: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2025.pdf",
    sourceTitle: "SSC notice, Combined Graduate Level Examination, 2026 (paras 9.4–9.6)",
    sourceDate: "2026-05-21",
    sourceDateMeaning: "Date the notice says it is to be uploaded on ssc.gov.in",
    photo: {
      kind: "live",
      guidance:
        "Paragraph 9.4 says you do not upload a photograph you already have. The application captures you live, in good light, on a plain background, camera at eye level, full face inside the frame, with no cap, mask or spectacles. A picture of a printed or saved photo is a stated ground for rejection, unless the application went through Aadhaar authentication."
    },
    signature: {
      kind: "upload",
      label: "Signature",
      width: 472,
      height: 157,
      pixelsVerified: false,
      pixelNote:
        "Paragraph 9.6 says the signature should be about 6.0 cm wide by 2.0 cm high. It does not state pixels or DPI. 472 × 157 px is that rectangle at 200 DPI, so the pixel size is unverified.",
      minKB: 10,
      maxKB: 20,
      kbVerified: true,
      fit: "contain",
      background: "The notice does not name a paper colour. Sign on a clean light sheet so the scan stays readable.",
      formatNote: jpeg
    },
    rejections: [
      "A live photograph of an existing photo, instead of your face (para 9.5).",
      "Cap, mask or spectacles in the captured photograph (paras 9.4 and 9.5).",
      "Face not fully inside the frame the camera draws, or the camera not at eye level (para 9.4).",
      "Signature that is not JPEG/JPG, or outside 10–20 KB (para 9.6).",
      "A blurred or miniature signature (para 9.6).",
      "Aadhaar-authenticated applications are not rejected on these photograph and signature grounds (paras 9.5 and 9.6)."
    ],
    faq: [
      {
        q: "Does SSC CGL still want a 20–50 KB passport photo upload?",
        a: "Not in this notice. Paragraph 9.4 replaced the old upload with a live capture while you fill the form. The only file this notice still asks you to prepare is the signature, 10–20 KB, about 6.0 cm × 2.0 cm."
      },
      {
        q: "What size should the SSC CGL signature be?",
        a: "JPEG or JPG, 10 KB to 20 KB, about 6.0 cm wide and 2.0 cm high (para 9.6). The notice does not give a pixel size. The file from this page uses 472 × 157 px, which is 6.0 × 2.0 cm at 200 DPI, and that pixel figure is marked unverified."
      },
      {
        q: "Can I wear glasses for the live photo?",
        a: "No. Paragraph 9.4(v) says candidates should not wear a cap, mask or glasses while the photograph is captured."
      },
      {
        q: "Will a bad signature reject an Aadhaar-authenticated form?",
        a: "The notice says applications submitted through Aadhaar-based authentication will not be rejected because the photograph or signature missed these standards (paras 9.5 and 9.6). The signature should still be yours and legible."
      }
    ],
    noticePoints: [
      "Applications are only on https://ssc.gov.in or the mySSC app (para 9.1).",
      "The signature you upload, the one on the attendance sheet, and the one in later correspondence are supposed to match. A variation can cancel the candidature (the same instruction is carried in the Commission’s application notices)."
    ]
  },
  {
    slug: "ssc-chsl",
    name: "SSC CHSL",
    shortName: "SSC CHSL",
    authority: "Staff Selection Commission",
    cycle: "Combined Higher Secondary (10+2) Level Examination, 2025",
    sourceUrl: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2025.pdf",
    sourceTitle: "SSC notice, Combined Higher Secondary (10+2) Level Examination, 2025 (paras 9.4–9.6)",
    sourceDate: "2025-06-23",
    sourceDateMeaning: "Date the notice says it is to be uploaded on ssc.gov.in",
    photo: {
      kind: "live",
      guidance:
        "Same rule as the Commission’s other 2025 notices: paragraph 9.4 captures the photograph live. Sit or stand in good light on a plain background, camera at eye level, full face inside the frame, no cap, mask or spectacles. Do not photograph a photograph."
    },
    signature: {
      kind: "upload",
      label: "Signature",
      width: 472,
      height: 157,
      pixelsVerified: false,
      pixelNote:
        "Paragraph 9.6 says about 6.0 cm (width) × 2.0 cm (height). No pixel size or DPI is printed. 472 × 157 px is 6.0 × 2.0 cm at 200 DPI and is unverified.",
      minKB: 10,
      maxKB: 20,
      kbVerified: true,
      fit: "contain",
      background: "Not stated. A plain light background keeps the ink readable.",
      formatNote: jpeg
    },
    rejections: [
      "Photograph of a pre-existing photograph (para 9.5).",
      "Cap, mask or spectacles while the live photo is captured (para 9.4).",
      "Face partly outside the frame, or too close or too far (para 9.4).",
      "Signature outside 10–20 KB or not JPEG/JPG (para 9.6).",
      "Blurred or miniature signature (para 9.6).",
      "Aadhaar-authenticated applications are exempt from rejection on these photograph and signature standards (paras 9.5 and 9.6)."
    ],
    faq: [
      {
        q: "Is the CHSL photo a file I upload?",
        a: "No. Paragraph 9.4 of the CHSL 2025 notice says the candidate is not required to have a pre-existing photograph. The form captures one. Prepare only the signature as a file."
      },
      {
        q: "What is the CHSL signature file size?",
        a: "10 KB to 20 KB, JPEG/JPG, about 6.0 cm wide by 2.0 cm high (para 9.6)."
      },
      {
        q: "Does CHSL use the old 3.5 cm × 4.5 cm photo upload?",
        a: "Not in this notice. That older upload instruction is not in paragraphs 9.4–9.6. Using it would be a guess, so this page does not offer a CHSL photograph file."
      },
      {
        q: "Are CGL and CHSL signature rules the same?",
        a: "In these two notices, yes: both say JPEG/JPG, 10 to 20 KB, about 6.0 cm × 2.0 cm. Each exam still has its own notice. Do not assume a later CHSL notice copies this one."
      }
    ],
    noticePoints: [
      "The notice tells candidates to check the preview before submitting, including that the photograph and signature meet paragraphs 9.4–9.6.",
      "One-time registration on the old ssc.nic.in site does not carry over. Registration is on the new ssc.gov.in site (para 9.2)."
    ]
  },
  {
    slug: "upsc-cse",
    name: "UPSC CSE",
    shortName: "UPSC",
    authority: "Union Public Service Commission",
    cycle: "Civil Services Examination, 2025",
    sourceUrl: "https://www.upsc.gov.in/sites/default/files/Notif-CSP-2025-Engl-220125.pdf",
    sourceTitle: "Examination Notice No. 05/2025-CSP and its Appendix-II",
    sourceDate: "2025-01-22",
    sourceDateMeaning: "Date printed on Examination Notice No. 05/2025-CSP",
    photo: {
      kind: "upload",
      label: "Photograph",
      pixelsVerified: false,
      pixelNote:
        "Appendix-II requires a .jpg between 20 KB and 300 KB. It does not state pixel dimensions. This tool does not invent a width and height; it only compresses the photograph you cropped.",
      minKB: 20,
      maxKB: 300,
      kbVerified: true,
      fit: "cover",
      background: "Plain white. Paragraph 9 of the notice says the face should occupy 3/4 of the photograph.",
      formatNote: "JPG, between 20 KB and 300 KB (Appendix-II)."
    },
    signature: {
      kind: "upload",
      label: "Signature",
      pixelsVerified: false,
      pixelNote:
        "Appendix-II puts the signature in the same 20–300 KB .jpg band and does not state pixels. A later candidate-portal sheet has circulated different numbers; they are not this examination notice, so they are not applied here.",
      minKB: 20,
      maxKB: 300,
      kbVerified: true,
      fit: "contain",
      background: "Not given a colour in Appendix-II. Use a clean light sheet.",
      formatNote: "JPG, between 20 KB and 300 KB (Appendix-II)."
    },
    rejections: [
      "Photograph more than 10 days old on the day online applications opened, 22 January 2025 for this notice (paragraph 9(a)).",
      "Name and the date the photograph was taken missing from the photograph (paragraph 9(b)).",
      "Face occupying less or more than about 3/4 of the photograph (paragraph 9(c)).",
      "Photograph or signature under 20 KB or over 300 KB, or not .jpg (Appendix-II).",
      "Appearance at the preliminary, the main, or the interview that does not match the uploaded photograph, including beard and spectacles (paragraph 9(d))."
    ],
    faq: [
      {
        q: "What is the UPSC CSE photo size in pixels?",
        a: "Examination Notice No. 05/2025-CSP does not print a pixel size. Appendix-II says each of the photograph and the signature must be a .jpg of at least 20 KB and at most 300 KB. This page will not substitute a square pixel size from a different portal document."
      },
      {
        q: "Does the face have to fill the photo?",
        a: "Yes. Paragraph 9(c) says the candidate’s face should occupy 3/4 of the space in the photograph. Crop before you encode. The tool checks file size, not face coverage."
      },
      {
        q: "Why do some sites say 550 × 550 pixels or a triple signature?",
        a: "Those figures appear in other UPSC portal instructions, not in Notice No. 05/2025-CSP. Where two official texts disagree, this page follows the examination notice and marks anything else unverified rather than mixing them."
      },
      {
        q: "What must be written on the photograph?",
        a: "Paragraph 9(b): the candidate’s name and the date the photograph was taken, clearly mentioned on the photograph. Add that in the photograph itself before uploading. This tool does not stamp it on for you."
      }
    ],
    noticePoints: [
      "Online applications for this notice ran from 22 January 2025 to 11 February 2025 (18:00). The 10-day photograph rule is measured from the start of that window.",
      "The same photograph has to match you at the preliminary exam, the written main, and the interview."
    ]
  },
  {
    slug: "ibps-po",
    name: "IBPS PO",
    shortName: "IBPS PO",
    authority: "Institute of Banking Personnel Selection",
    cycle: "CRP PO/MT-XV (registration 1–28 July 2025)",
    sourceUrl: "https://ibpsreg.ibps.in/crppoxvjun25/",
    sourceTitle: "CRP PO/MT-XV online registration, guidelines for scanning and upload of documents",
    sourceDate: "2025-07-01",
    sourceDateMeaning: "Opening date of online registration for CRP PO/MT-XV",
    photo: {
      kind: "upload",
      label: "Photograph",
      width: 200,
      height: 230,
      pixelsVerified: true,
      pixelNote:
        "The scanning guidelines say “Dimensions 200 x 230 pixels (preferred)” and a file between 20 KB and 50 KB. Preferred is the word IBPS prints; 200 × 230 is still the figure in the notice.",
      minKB: 20,
      maxKB: 50,
      kbVerified: true,
      fit: "cover",
      background: "Light-coloured, preferably white.",
      formatNote: jpeg
    },
    signature: {
      kind: "upload",
      label: "Signature",
      width: 140,
      height: 60,
      pixelsVerified: true,
      pixelNote: "“Dimensions 140 x 60 pixels (preferred)”, file between 10 KB and 20 KB.",
      minKB: 10,
      maxKB: 20,
      kbVerified: true,
      fit: "contain",
      background: "White paper, black ink. The guidelines reject a signature written in capital letters.",
      formatNote: jpeg
    },
    rejections: [
      "Photograph over 50 KB, or signature over 20 KB. The form does not move on until both are inside the specification.",
      "Photograph that is not a recent colour picture on a light, preferably white, background.",
      "Caps, hats or dark glasses. Religious headwear is allowed if it does not cover the face.",
      "Red-eye, harsh shadows, or eyes hidden by glare on glasses.",
      "Signature in capital letters, or signed in anything other than black ink on white paper.",
      "Photograph and signature files swapped.",
      "The live webcam or phone capture, which is required in addition to the scanned photograph, taken against a dark or cluttered background."
    ],
    faq: [
      {
        q: "What is the IBPS PO photo size?",
        a: "200 × 230 pixels preferred, 20 KB to 50 KB. The guidelines also describe the print as 4.5 cm × 3.5 cm. Scan at 200 dpi or more, true colour, then crop to 200 × 230."
      },
      {
        q: "What is the IBPS PO signature size?",
        a: "140 × 60 pixels preferred, 10 KB to 20 KB, black ink on white paper, not in capital letters."
      },
      {
        q: "Is the scanned photo enough?",
        a: "No. CRP PO/MT-XV also captures a live photograph by webcam or by scanning a QR code with a phone. That live picture has its own do’s and don’ts: light background, looking straight at the camera, no sunglasses, cap or mask."
      },
      {
        q: "Will 199 × 230 be accepted?",
        a: "The notice says 200 × 230 is preferred, not that every other size is rejected. This tool writes exactly 200 × 230 so the file matches the figure IBPS prints."
      }
    ],
    noticePoints: [
      "Keep about eight copies of the same photograph. Later stages of the selection ask for it.",
      "The guidelines also cover a left-thumb impression and a handwritten declaration. Those are separate uploads and are not produced here."
    ]
  },
  {
    slug: "ibps-clerk",
    name: "IBPS Clerk",
    shortName: "IBPS Clerk",
    authority: "Institute of Banking Personnel Selection",
    cycle: "CRP CSA-XV, Customer Service Associates (registration 1–21 August 2025)",
    sourceUrl: "https://ibpsreg.ibps.in/crpcsaxvjl25/",
    sourceTitle: "CRP CSA-XV notification, guidelines for scanning and upload (Annexure)",
    sourceDate: "2025-08-01",
    sourceDateMeaning: "Opening date of online registration for CRP CSA-XV",
    photo: {
      kind: "upload",
      label: "Photograph",
      width: 200,
      height: 230,
      pixelsVerified: true,
      pixelNote: "Annexure: “Dimensions 200 x 230 pixels (preferred).” File size 20 KB–50 KB. The print size named beside it is 4.5 cm × 3.5 cm.",
      minKB: 20,
      maxKB: 50,
      kbVerified: true,
      fit: "cover",
      background: "Light-coloured, preferably white.",
      formatNote: jpeg
    },
    signature: {
      kind: "upload",
      label: "Signature",
      width: 140,
      height: 60,
      pixelsVerified: true,
      pixelNote: "Annexure: 140 × 60 pixels (preferred), 10 KB–20 KB, not in capital letters.",
      minKB: 10,
      maxKB: 20,
      kbVerified: true,
      fit: "contain",
      background: "White paper, black ink.",
      formatNote: jpeg
    },
    rejections: [
      "Photograph above 50 KB or signature above 20 KB. The annexure says the system will not continue until the photograph and signature match the specification.",
      "Photograph that is not recent, not in colour, or not on a light background.",
      "Caps, hats or dark glasses. Religious headwear must leave the face clear.",
      "Signature in capital letters.",
      "A small live photograph, coloured glasses, a shadow on the face, or a mask, in the separate webcam capture.",
      "Class 10 certificate or the thumb impression and handwritten declaration missing — those are other uploads, and the application is not registered without them."
    ],
    faq: [
      {
        q: "Are IBPS Clerk and IBPS PO photo sizes the same?",
        a: "In CRP CSA-XV and CRP PO/MT-XV, the scanning annexes print the same preferred figures: photograph 200 × 230 pixels and 20–50 KB, signature 140 × 60 pixels and 10–20 KB. They are still separate notices. Check the one for the exam you are filling."
      },
      {
        q: "What does “preferred” mean?",
        a: "IBPS prints “200 x 230 pixels (preferred)”, not “only”. Matching the preferred size is the instruction candidates are given when a file is rejected for size. This tool uses that size."
      },
      {
        q: "Do I also need a live photo?",
        a: "Yes. The CRP CSA-XV instructions say candidates capture a photograph through a webcam or mobile phone during registration, in addition to the scanned file."
      },
      {
        q: "What file type is accepted?",
        a: "JPG or JPEG. The annexure tells Windows users to save as JPEG and then crop and resize. PNG will not satisfy that line."
      }
    ],
    noticePoints: [
      "Eligibility dates printed on the CSA-XV notice: age as on 1 August 2025, and educational qualifications as on 21 August 2025.",
      "After upload, use the preview. The notice says an unclear or smudged image should be replaced before you finish."
    ]
  },
  {
    slug: "sbi-po",
    name: "SBI PO",
    shortName: "SBI PO",
    authority: "State Bank of India",
    cycle: "Probationary Officers, detailed advertisement dated 23 June 2025",
    sourceUrl:
      "https://sbi.bank.in/documents/77530/52947104/1_Detailed_Adv.2025_23.06.2025.pdf/54ca0942-3de1-afc4-45e8-f679fc552e7b?t=1750741324277",
    sourceTitle: "SBI detailed advertisement dated 23 June 2025, Annexure II",
    sourceDate: "2025-06-23",
    sourceDateMeaning: "Date on the detailed advertisement",
    photo: {
      kind: "upload",
      label: "Photograph",
      width: 200,
      height: 230,
      pixelsVerified: true,
      pixelNote:
        "Annexure II: photograph 4.5 cm × 3.5 cm, “Dimensions 200 x 230 pixels (preferred)”, file 20 KB–50 KB.",
      minKB: 20,
      maxKB: 50,
      kbVerified: true,
      fit: "cover",
      background: "Light-coloured, preferably white.",
      formatNote: "JPG or JPEG."
    },
    signature: {
      kind: "upload",
      label: "Signature",
      width: 140,
      height: 60,
      pixelsVerified: true,
      pixelNote: "Annexure II: “Dimensions 140 x 60 pixels (preferred)”, file 10 KB to 20 KB.",
      minKB: 10,
      maxKB: 20,
      kbVerified: true,
      fit: "contain",
      background: "White paper, black ink. Capital letters are not accepted.",
      formatNote: "JPG or JPEG."
    },
    rejections: [
      "Photograph over 50 KB or signature over 20 KB.",
      "Signature in capital letters.",
      "Caps, hats or dark glasses. Religious headwear is allowed if the face is uncovered.",
      "Red-eye, squinting, or a shadow from on-camera flash.",
      "Glasses with a reflection that hides the eyes.",
      "A file that is not JPG or JPEG.",
      "Photo, signature, thumb impression or the handwritten declaration uploaded in each other’s slots. The advertisement says the application is not registered unless all four are in the right place."
    ],
    faq: [
      {
        q: "What is the SBI PO photo size?",
        a: "Annexure II of the 23 June 2025 advertisement: 200 × 230 pixels preferred, 20 KB to 50 KB, described as a 4.5 cm × 3.5 cm colour photograph on a light background."
      },
      {
        q: "What is the SBI PO signature size?",
        a: "140 × 60 pixels preferred, 10 KB to 20 KB, black ink on white paper, not in capital letters."
      },
      {
        q: "Does SBI also want a handwritten declaration?",
        a: "Yes. Annexure II asks for a left-hand thumb impression and a handwritten declaration (800 × 400 pixels preferred, 50–100 KB, the declaration text printed in the annexure). This page only makes the photograph and the signature."
      },
      {
        q: "Is there a live photo as well?",
        a: "Yes. The annexure says candidates also capture a live photograph through a webcam or mobile phone during registration."
      }
    ],
    noticePoints: [
      "The bank’s careers FAQ repeats the same preferred sizes: 200 × 230 and 20–50 KB for the photo, 140 × 60 and 10–20 KB for the signature (https://sbi.bank.in/web/careers/probationary-officers).",
      "Keep the same photograph for later stages. The advertisement suggests retaining about eight copies.",
      "This row is the Probationary Officer advertisement. An SBI Clerk notice was not read for this page, so Clerk is not listed as the same specification."
    ]
  },
  {
    slug: "neet-ug",
    name: "NEET UG",
    shortName: "NEET UG",
    authority: "National Testing Agency",
    cycle: "NEET (UG) 2025 information bulletin",
    sourceUrl: "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2025/02/2025020754.pdf",
    sourceTitle: "Information Bulletin for NEET (UG) 2025",
    sourceDate: "2025-02-07",
    sourceDateMeaning: "Date in the NTA upload path of the bulletin PDF",
    photo: {
      kind: "upload",
      label: "Photograph",
      pixelsVerified: false,
      pixelNote:
        "The bulletin gives 10 KB to 200 KB and a passport-size colour photograph. It does not give pixels. This tool only brings the file into that range and does not force a pixel size.",
      minKB: 10,
      maxKB: 200,
      kbVerified: true,
      fit: "cover",
      background: "White. 80% of the face, including the ears, and no mask.",
      formatNote: "JPG/JPEG, 10 KB to 200 KB. The bulletin’s checklist names JPG/JPEG for the passport photograph."
    },
    signature: {
      kind: "upload",
      label: "Signature",
      pixelsVerified: false,
      pixelNote: "The bulletin states 10 KB to 50 KB and does not state pixel dimensions.",
      minKB: 10,
      maxKB: 50,
      kbVerified: true,
      fit: "contain",
      background: "Not given an ink colour. Keep the scan clearly legible, which the bulletin repeats.",
      formatNote: "JPG/JPEG, 10 KB to 50 KB."
    },
    rejections: [
      "Passport photograph outside 10–200 KB, or not clearly legible.",
      "Photograph that is not recent colour, not showing about 80% face including ears, or not on white.",
      "A mask in the photograph.",
      "Photograph taken before 1 January 2025. The bulletin says the passport photograph should be taken after that date.",
      "Signature outside 10–50 KB.",
      "Postcard-size photograph, thumb impressions and certificates are separate uploads with their own ranges. A signature file will not stand in for them."
    ],
    faq: [
      {
        q: "What is the NEET UG 2025 photo size?",
        a: "A recent colour passport photograph taken after 1 January 2025, 80% of the face including ears visible, white background, no mask, JPG/JPEG between 10 KB and 200 KB. The bulletin does not print a pixel size, so none is applied here."
      },
      {
        q: "What is the NEET signature size?",
        a: "JPG/JPEG, 10 KB to 50 KB, clearly legible. No width or height is stated."
      },
      {
        q: "Is there a second photograph?",
        a: "Yes. The bulletin also asks for a postcard-size photograph between 10 KB and 200 KB, and for scans of both hands’ fingers and thumbs between 10 KB and 200 KB. Those are not the passport photograph."
      },
      {
        q: "Why does the file from this page keep my crop’s pixel size?",
        a: "Because inventing 3.5 × 4.5 cm in pixels would be a guess. The bulletin’s measurable limits for these two files are the kilobyte ranges. If your photograph is still over 200 KB at a low JPEG quality, the tool scales it down and says that it did."
      }
    ],
    noticePoints: [
      "The bulletin index on the NTA NEET site is https://neet.nta.nic.in/document/information-bulletin-for-neetug-2025/.",
      "Class X certificates and category certificates are PDF, 50–300 KB. Do not run those through this JPEG tool."
    ]
  },
  {
    slug: "jee-main",
    name: "JEE Main",
    shortName: "JEE Main",
    authority: "National Testing Agency",
    cycle: "JEE (Main) 2026 information bulletin",
    sourceUrl: "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/10/20251031903987934.pdf",
    sourceTitle: "JEE (Main) 2026 Information Bulletin, application procedure",
    sourceDate: "2025-10-31",
    sourceDateMeaning: "Date in the NTA upload path of the bulletin PDF",
    photo: {
      kind: "upload",
      label: "Photograph",
      pixelsVerified: false,
      pixelNote:
        "The bulletin says a recent passport-size colour photograph, JPG/JPEG, 10 KB to 200 KB, and does not state pixels.",
      minKB: 10,
      maxKB: 200,
      kbVerified: true,
      fit: "cover",
      background: "White. 80% of the face, including ears, without a mask.",
      formatNote: "JPG/JPEG, 10 KB to 200 KB."
    },
    signature: {
      kind: "upload",
      label: "Signature",
      pixelsVerified: false,
      pixelNote: "The bulletin says JPG/JPEG, 10 KB to 100 KB, clearly legible, and does not state pixels or an ink colour.",
      minKB: 10,
      maxKB: 100,
      kbVerified: true,
      fit: "contain",
      background: "Not stated. The file has to stay clearly legible.",
      formatNote: "JPG/JPEG, 10 KB to 100 KB."
    },
    rejections: [
      "Uploaded photograph outside 10–200 KB or not JPG/JPEG.",
      "Face coverage under about 80%, ears hidden, a mask, or a background that is not white.",
      "Signature outside 10–100 KB or not JPG/JPEG.",
      "Live photograph, captured in the form, that does not show 80% of the face on a light background. The bulletin requires this live capture in addition to the scanned file.",
      "Using someone else’s photograph or signature. The bulletin treats that as unfair means.",
      "Class 10 marksheet uploaded as a JPEG. That document is a PDF of 50–300 KB."
    ],
    faq: [
      {
        q: "What is the JEE Main 2026 photo size?",
        a: "JPG/JPEG between 10 KB and 200 KB, recent colour passport size, 80% of the face including ears, no mask, white background. The bulletin states no pixel dimensions."
      },
      {
        q: "What is the JEE Main signature size?",
        a: "JPG/JPEG between 10 KB and 100 KB, clearly legible. No centimetre or pixel size is printed in the bulletin."
      },
      {
        q: "Is a live photo required as well?",
        a: "Yes. Step 2 of the application procedure says the candidate uploads a live photograph while filling the form, by webcam or by scanning the QR code, with a light-coloured background and 80% of the face visible including the ears, without a mask."
      },
      {
        q: "Some articles say 3.5 cm × 4.5 cm and 10–300 KB. Which is right?",
        a: "Those figures are not what this bulletin prints. The October 2025 JEE (Main) 2026 bulletin says 10–200 KB for the photograph and 10–100 KB for the signature, with no centimetre size. This page follows the bulletin."
      }
    ],
    noticePoints: [
      "The bulletin index is https://jeemain.nta.nic.in/information-bulletin/.",
      "The same application number is used for both sessions of JEE (Main) 2026. The photograph you upload is the one NTA can later compare."
    ]
  },
  {
    slug: "rrb-ntpc",
    name: "RRB NTPC",
    shortName: "RRB NTPC",
    authority: "Railway Recruitment Boards",
    cycle: "CEN No. 07/2025, NTPC Undergraduate",
    sourceUrl: "https://www.rrbcdg.gov.in/uploads/2025/07-NTPCUG/072025NTPCUG-ApplicationFAQs.pdf",
    sourceTitle: "CEN 07/2025 NTPC (Undergraduate) application FAQ, questions 60 and the live-photo guidance",
    sourceDate: "2025-10-28",
    sourceDateMeaning: "Application opening date stated in FAQ question 1",
    photo: {
      kind: "live",
      guidance:
        "The FAQ says candidates are not required to upload a pre-existing photograph. The form captures a live photo by webcam or the phone’s front camera. Dress in non-white, preferably dark, clothing. Camera at eye level, neutral expression, whole face inside the frame, no cap, mask or spectacles. A picture of a printed or saved photograph is rejected. See the FAQ’s live-photograph section, which points at paragraph 14.4 of CEN 07/2025."
    },
    signature: {
      kind: "upload",
      label: "Signature",
      width: 140,
      height: 60,
      pixelsVerified: true,
      pixelNote:
        "FAQ question 60: minimum 140 pixels wide × 60 pixels high, at least 100 DPI, JPG/JPEG, 30 KB to 49 KB. 140 × 60 is a minimum, not a maximum. The file this tool writes is exactly that minimum, which meets “at least”. The signature also has to sit inside a 35 mm × 20 mm box on the form.",
      minKB: 30,
      maxKB: 49,
      kbVerified: true,
      fit: "contain",
      background: "White paper, black ink, running handwriting. Block, capital or disjointed letters are listed as rejectable in the same CEN instructions the FAQ points to.",
      formatNote: "JPG/JPEG, 30 KB to 49 KB. The FAQ prints 49 KB, not 50 KB."
    },
    rejections: [
      "Uploading a saved or printed photograph instead of the live capture.",
      "White clothing against the live-photo background, or a cap, mask or spectacles.",
      "Signature under 30 KB or over 49 KB, or under 140 × 60 pixels.",
      "Signature not in JPG/JPEG, or scanned below the 100 DPI minimum.",
      "Signature outside the 35 mm × 20 mm box, or not centred in it.",
      "Black ink missing, a non-white background, block or capital letters, a thumb impression in place of a signature, or a blank image.",
      "SC/ST candidates who want the free travel pass and do not upload the caste certificate (PDF, up to 400 KB). That is a separate file."
    ],
    faq: [
      {
        q: "Does RRB NTPC want a passport-photo file?",
        a: "Not for CEN 07/2025. The FAQ says there is no pre-existing photograph to upload. The photograph is captured live. The image file you prepare is the signature."
      },
      {
        q: "What is the RRB NTPC signature size?",
        a: "JPG/JPEG, 30 KB to 49 KB, at least 140 × 60 pixels, at least 100 DPI, placed in a 35 mm × 20 mm box (FAQ question 60, pointing at paragraph 14.5.1 of CEN 07/2025)."
      },
      {
        q: "Why 49 KB and not 50 KB?",
        a: "Because question 60 prints “30 KB to 49 KB”. A 50 KB file is outside that sentence. Other RRB notices have used 30–50 KB; this page does not copy them onto CEN 07/2025."
      },
      {
        q: "Is CEN 06/2025 (NTPC Graduate) the same?",
        a: "It was not the notice read for this row. Graduate and Undergraduate CENs are different documents. Use this page for CEN 07/2025 only, and read CEN 06/2025 before you rely on it."
      }
    ],
    noticePoints: [
      "Applications for CEN 07/2025 opened on 28 October 2025 and closed on 27 November 2025 (23:59), with fee payment until 29 November 2025, according to FAQ questions 1 and 2.",
      "The modification window in that FAQ ran from 30 November 2025 to 9 December 2025."
    ]
  }
];

const BY_SLUG = new Map(EXAMS.map(e => [e.slug, e]));

export function findExam(slug: string | undefined): Exam | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

export function isUpload(spec: LiveCapture | UploadSpec): spec is UploadSpec {
  return spec.kind === "upload";
}
