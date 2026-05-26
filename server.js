import express from "express";
import axios from "axios";
import pkg from "number-to-words";
import dotenv from "dotenv";

dotenv.config();

const { toWords } = pkg;

const app = express();

app.use(express.json());

const PORT = process.env.PORT;

const BITRIX_WEBHOOK = process.env.BITRIX_WEBHOOK;

const CUSTOM_FIELD = process.env.CUSTOM_FIELD;

function convertAmountToWords(amount) {
  const rounded = Math.round(amount);

  let words = toWords(rounded)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `${words} Rupees Only`;
}

app.post("/bitrix/invoice", async (req, res) => {
  try {
    console.log("BODY => ", req.body);

    const invoiceId = req.body.invoiceId;

    const amount = Number(req.body.opportunity);

    if (!invoiceId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    const amountWords = convertAmountToWords(amount);

    console.log("WORDS => ", amountWords);

    // SMART INVOICE UPDATE
    await axios.post(
      `${BITRIX_WEBHOOK}/crm.item.update.json`,
      {
        entityTypeId: 31,
        id: invoiceId,
        fields: {
          [CUSTOM_FIELD]: amountWords,
        },
      }
    );

    return res.json({
      success: true,
      amountWords,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});