import crypto from "node:crypto";
import { fulfillOrder, RESERVATION_MINUTES } from "./vnpay.mjs";

const iso = (value) => new Date(value).toISOString();

export const getMomoConfig = () => {
  const port = process.env.PORT || 3000;
  let partnerCode = process.env.MOMO_PARTNER_CODE;
  let accessKey = process.env.MOMO_ACCESS_KEY;
  let secretKey = process.env.MOMO_SECRET_KEY;

  if (!partnerCode || partnerCode === "MOMO") {
    partnerCode = "MOMOBKUN20180529";
    accessKey = "klm05TvNBzhg7h7j";
    secretKey = "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa";
  }

  return {
    partnerCode,
    accessKey,
    secretKey,
    apiUrl:
      process.env.MOMO_API_URL ||
      "https://test-payment.momo.vn/v2/gateway/api/create",
    returnUrl:
      process.env.MOMO_RETURN_URL ||
      `http://127.0.0.1:${port}/api/payments/momo/return`,
    ipnUrl:
      process.env.MOMO_IPN_URL ||
      `http://127.0.0.1:${port}/api/payments/momo/ipn`,
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    requestType: process.env.MOMO_REQUEST_TYPE || "payWithMethod",
  };
};

export const signHmacSha256 = (rawSignature, secretKey) =>
  crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature, "utf8")
    .digest("hex");

export const buildMomoCreateRawSignature = ({
  accessKey,
  amount,
  extraData = "",
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
}) =>
  `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

export const buildMomoCallbackRawSignature = ({
  accessKey,
  amount,
  extraData = "",
  message,
  orderId,
  orderInfo,
  orderType,
  partnerCode,
  payType,
  requestId,
  responseTime,
  resultCode,
  transId,
}) =>
  `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

export const verifyMomoSignature = (payload, secretKey, fallbackAccessKey) => {
  const receivedSignature = String(payload.signature || "").toLowerCase();
  if (!receivedSignature) return false;

  const accessKey = payload.accessKey || fallbackAccessKey || "";
  const raw = buildMomoCallbackRawSignature({
    accessKey,
    amount: payload.amount,
    extraData: payload.extraData ?? "",
    message: payload.message,
    orderId: payload.orderId,
    orderInfo: payload.orderInfo,
    orderType: payload.orderType,
    partnerCode: payload.partnerCode,
    payType: payload.payType,
    requestId: payload.requestId,
    responseTime: payload.responseTime,
    resultCode: payload.resultCode,
    transId: payload.transId,
  });

  const expectedSignature = signHmacSha256(raw, secretKey).toLowerCase();
  const receivedBuf = Buffer.from(receivedSignature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");

  return (
    receivedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(receivedBuf, expectedBuf)
  );
};

export const createMomoPaymentAttempt = async ({
  order,
  config,
  ipAddress = "127.0.0.1",
  now = new Date(),
}) => {
  const orderId = order.orderCode;
  const requestId = `momo_req_${crypto.randomUUID()}`;
  const amount = Math.round(Number(order.totalAmount));
  const orderInfo = `Thanh toán đơn hàng ${order.orderCode} qua Ví MoMo`;
  const redirectUrl = config.returnUrl;
  const ipnUrl = config.ipnUrl;
  const extraData = Buffer.from(
    JSON.stringify({
      orderId: order.id,
      lookupToken: order.lookupToken,
    }),
  ).toString("base64");
  const requestType = config.requestType || "payWithMethod";
  const lang = "vi";

  const rawSignature = buildMomoCreateRawSignature({
    accessKey: config.accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl,
    requestId,
    requestType,
  });

  const signature = signHmacSha256(rawSignature, config.secretKey);

  const requestBody = {
    partnerCode: config.partnerCode,
    partnerName: "HCore Store",
    storeId: "HCoreStore_01",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    extraData,
    requestType,
    signature,
  };

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const momoData = await response.json().catch(() => ({}));

  if (!response.ok || (momoData.resultCode !== 0 && momoData.resultCode !== undefined)) {
    const errorMsg =
      momoData.message ||
      `Cổng thanh toán MoMo Sandbox trả về lỗi HTTP ${response.status}`;
    throw new Error(`MoMo Gateway: ${errorMsg}`);
  }

  if (!momoData.payUrl) {
    throw new Error("MoMo Sandbox không trả về URL thanh toán (payUrl).");
  }

  const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000);
  const attempt = {
    id: `pay_${crypto.randomUUID()}`,
    orderId: order.id,
    txnRef: orderId,
    momoRequestId: requestId,
    paymentMethod: "momo",
    amount,
    status: "pending",
    createdAt: iso(now),
    expiresAt: iso(expiresAt),
    paymentUrl: momoData.payUrl,
    qrCodeUrl: momoData.qrCodeUrl || null,
    deeplink: momoData.deeplink || null,
  };

  return attempt;
};

export const processMomoIpn = ({ state, body, config, now = new Date() }) => {
  if (!verifyMomoSignature(body, config.secretKey, config.accessKey)) {
    return {
      status: 400,
      response: { resultCode: 97, message: "Invalid signature" },
      changed: false,
    };
  }

  if (body.partnerCode !== config.partnerCode) {
    return {
      status: 400,
      response: { resultCode: 97, message: "Invalid merchant" },
      changed: false,
    };
  }

  const attempt = (state.paymentAttempts || []).find(
    (item) =>
      item.txnRef === body.orderId || item.momoRequestId === body.requestId,
  );

  if (!attempt) {
    return {
      status: 404,
      response: { resultCode: 1, message: "Order attempt not found" },
      changed: false,
    };
  }

  const order = (state.orders || []).find((item) => item.id === attempt.orderId);
  if (!order) {
    return {
      status: 404,
      response: { resultCode: 1, message: "Order not found" },
      changed: false,
    };
  }

  if (Number(attempt.amount) !== Number(body.amount)) {
    return {
      status: 400,
      response: { resultCode: 4, message: "Invalid amount" },
      changed: false,
    };
  }

  if (order.paymentStatus === "paid") {
    return {
      status: 200,
      response: { resultCode: 0, message: "Order already confirmed" },
      changed: false,
    };
  }

  attempt.resultCode = body.resultCode;
  attempt.transId = body.transId || null;
  attempt.payType = body.payType || null;
  attempt.responseTime = body.responseTime || null;
  attempt.message = body.message || "";
  attempt.ipnReceivedAt = iso(now);

  const successful = Number(body.resultCode) === 0;
  if (successful) {
    try {
      fulfillOrder(state, order, now);
    } catch (error) {
      attempt.processingError = error.message;
      return {
        status: 500,
        response: { resultCode: 99, message: error.message || "Unknown error" },
        changed: true,
      };
    }
    attempt.status = "paid";
    if (order.status === "cancelled") {
      order.status = "pending";
      order.reopenedByLatePayment = true;
    }
    order.paymentStatus = "paid";
    order.paidAt = iso(now);
    order.paidPaymentAttemptId = attempt.id;
    order.momoTransId = attempt.transId;
    order.reservationExpiresAt = null;
  } else {
    attempt.status = "failed";
    if (order.latestPaymentAttemptId === attempt.id) {
      order.paymentStatus = "failed";
      order.reservationExpiresAt = null;
    }
  }

  order.updatedAt = iso(now);
  return {
    status: 200,
    response: { resultCode: 0, message: "Confirm Success" },
    changed: true,
  };
};
