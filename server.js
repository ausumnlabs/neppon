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

function convertAmountToWords(amount) {
  const rounded = Math.round(amount);

  let words = toWords(rounded)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `${words} Rupees Only`;
}

app.get("/bitrix/invoice", (req, res) => {
  console.log("GET ROUTE HIT");

  res.send("Webhook Route Working");
});

app.post("/bitrix/invoice", async (req, res) => {
    
    
     console.log("BODY RECEIVED =>");
  console.log(JSON.stringify(req.body, null, 2));
  try {
    console.log(
      "WEBHOOK BODY => ",
      JSON.stringify(req.body, null, 2)
    );

    // OUTBOUND WEBHOOK DATA
    const invoiceId =
      req.body?.data?.FIELDS?.ID;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID missing",
      });
    }

    console.log("INVOICE ID => ", invoiceId);

    // GET INVOICE DETAILS
    const invoiceResponse = await axios.post(
      `${BITRIX_WEBHOOK}/crm.invoice.get.json`,
      {
        id: invoiceId,
      }
    );

    const invoice =
      invoiceResponse.data.result;

    console.log("INVOICE => ", invoice);

    const amount = Number(invoice.PRICE);

    const amountWords =
      convertAmountToWords(amount);

    console.log("AMOUNT WORDS => ", amountWords);

    // UPDATE CUSTOM FIELD
    const updateResponse = await axios.post(
      `${BITRIX_WEBHOOK}/crm.invoice.update.json`,
      {
        id: invoiceId,
        fields: {
          [CUSTOM_FIELD]: amountWords,
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