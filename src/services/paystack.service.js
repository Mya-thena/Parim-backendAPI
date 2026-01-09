const axios = require("axios");

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const paystack = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json"
  }
});

exports.resolveAccount = async (accountNumber, bankCode) => {
  const response = await paystack.get(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  );
  return response.data;
};

exports.validateBVN = async (bvn) => {
  const response = await paystack.get(`/bvn/resolve/${bvn}`);
  return response.data;
};
