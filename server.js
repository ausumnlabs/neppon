import express from "express";
import axios from "axios";
import pkg from "number-to-words";
import dotenv from "dotenv";

dotenv.config();

const { toWords } = pkg;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

const BITRIX_WEBHOOK = process.env.BITRIX_WEBHOOK;

const CUSTOM_FIELD = process.env.CUSTOM_FIELD;


function convertNumberToWords(num) {

  const a = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE",
    "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN",
    "FIFTEEN", "SIXTEEN", "SEVENTEEN",
    "EIGHTEEN", "NINETEEN"
  ];

  const b = [
    "", "", "TWENTY", "THIRTY", "FORTY",
    "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
  ];

  function inWords(n) {

    if (n < 20) return a[n];

    if (n < 100)
      return b[Math.floor(n / 10)] +
        (n % 10 ? " " + a[n % 10] : "");

    if (n < 1000)
      return a[Math.floor(n / 100)] +
        " HUNDRED" +
        (n % 100 ? " " + inWords(n % 100) : "");

    if (n < 100000)
      return inWords(Math.floor(n / 1000)) +
        " THOUSAND" +
        (n % 1000 ? " " + inWords(n % 1000) : "");

    if (n < 10000000)
      return inWords(Math.floor(n / 100000)) +
        " LAKH" +
        (n % 100000 ? " " + inWords(n % 100000) : "");

    return inWords(Math.floor(n / 10000000)) +
      " CRORE" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "");
  }

  const number = Number(num).toFixed(2);

  const [rupees, paisa] = number.split(".");

  let words = `INR. ${inWords(Number(rupees))}`;

  if (Number(paisa) > 0) {
    words += ` AND ${inWords(Number(paisa))} PAISA`;
  }

  words += " ONLY";

  return words;
}


app.get("/bitrix/invoice", (req, res) => {
  console.log("GET ROUTE HIT");

  res.send("Webhook Route Working");
});




app.post("/bitrix/invoice", async (req, res) => {
  try {

    console.log(
      "WEBHOOK BODY => ",
      JSON.stringify(req.body, null, 2)
    );

    // SMART INVOICE ID
    const rawId =
      req.body.document_id?.[2];

    const invoiceId =
      rawId?.replace("SMART_INVOICE_", "");

    console.log("RAW ID => ", rawId);

    console.log("INVOICE ID => ", invoiceId);

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID missing",
      });
    }

    // GET SMART INVOICE
    const invoiceResponse = await axios.post(
      `${BITRIX_WEBHOOK}/crm.item.get.json`,
      {
        entityTypeId: 31,
        id: invoiceId,
      }
    );

    console.log(
      "INVOICE RESPONSE => ",
      invoiceResponse.data
    );

    const invoice =
      invoiceResponse.data.result.item;

    // TOTAL AMOUNT
    const amount = Number(
      invoice.opportunity
    );

    console.log("AMOUNT => ", amount);

    // CONVERT TO WORDS
    const amountWords =
      convertNumberToWords(amount);

    console.log(
      "AMOUNT WORDS => ",
      amountWords
    );

    // UPDATE CUSTOM FIELD
    const updateResponse = await axios.post(
      `${BITRIX_WEBHOOK}/crm.item.update.json`,
      {
        entityTypeId: 31,
        id: invoiceId,
        fields: {
        comments: amountWords,
    },
      }
    );

    console.log(
      "UPDATE RESPONSE => ",
      updateResponse.data
    );

    return res.json({
      success: true,
      amountWords,
    });

  } catch (error) {

    console.log(
      "ERROR => ",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.response?.data || error.message,
    });
  }
});




app.get("/", (req, res) => {
  res.send("Bitrix Invoice Automation Running");
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});