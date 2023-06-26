import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { DateTime } from "luxon";

import { dictZip, formatOffsetTime } from "../../utils/index.js";

const baseUrl =
  "https://www.google.com/finance/_/GoogleFinanceUi/data/batchexecute?";
const headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko)",
};

let proxy = null;
const setProxy = (url) => proxy = new HttpsProxyAgent(url);
const timeout = 10000;

const randNumStr = (l) => Math.floor(Math.random() * 10 ** l).toString();
const outArray = (a) => (a.length > 1 ? a : outArray(a[0]));

const batchExec = async (envelopes) => {
  const envs = Array.isArray(envelopes) ? envelopes : [envelopes];
  const rpcids = envs
    .map((e) => e.id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .join(",");
  if (envs.length === 0) return;

  const payload =
    envs.length === 1
      ? [[[envs[0].id, JSON.stringify(envs[0].data), null, "generic"]]]
      : [envs.map((e, i) => [e.id, JSON.stringify(e.data), null, `${i + 1}`])];
  const params = new URLSearchParams({
    rpcids: rpcids,
    'f.sid': randNumStr(19),
    'f.req': JSON.stringify(payload), 
    bl: 'boq_finance-ui_20211101.11_p0', 
    _reqid: randNumStr(8), 
  });
  const response = await fetch(
    `${baseUrl}${params.toString()}`,
    {
      method: 'POST',
      headers,
      agent: proxy,
    }
  );
  if (!response.ok) {
    throw new Error(`网络错误: ${response.type}`);
  }
  const [, , rsps] = (await response.text()).split("\n");
  const datas = [];
  const parsedRsps = JSON.parse(rsps);
  for (const r of parsedRsps) {
    if (r[0] === "er") {
      throw new Error(`请求错误: ${r[5]}`);
    } else if (r[0] === "wrb.fr") {
      const cur = JSON.parse(r[2]);
      datas.splice(
        r[6] !== "generic" ? parseInt(r[6], 10) - 1 : 0,
        0,
        cur.length > 0 ? cur : []
      );
    }
  }
  return datas.length > 1 ? datas : datas[0];
};

const parseTrading = (i) => {
  if (!i) {
    return null;
  }
  return {
    last: i[0],
    change: i[1],
    change_percent: i[2],
  };
};

const parseDatetime = (i) => {
  const objKey = [
      "year",
      "month",
      "day",
      "hour",
      "minute",
      "second",
      "millisecond",
    ],
    objValue = [];
  const opts = { zone: "utc" };
  for (const item of i) {
    if (Number.isFinite(item)) {
      objValue.push(item);
    } else if (!item) {
      objValue.push(0);
    } else if (Array.isArray(item) && item.length > 0) {
      opts.zone = formatOffsetTime(item[0]);
    }
  }
  return DateTime.fromObject(dictZip(objKey, objValue), opts);
};

const parseDetail = (i) => {
  if (!i || i.length < 5 || !i[4]) {
    return null;
  }
  return {
    inner_id: i[0],
    code: i[1][0],
    market: i[1][1] || null,
    name: i[2],
    currency: i[4],
    trading: parseTrading(i[5]),
    last_close: i[7],
    region: i[9],
    update_timestamp: DateTime.fromSeconds(i[11][0]),
    timezone: i[12],
    timezone_offset: i[13],
    extended_trading: parseTrading(i[16]),
    last_timestamp: DateTime.fromSeconds(i[17][0]),
    extended_timestamp: i[18] ? DateTime.fromSeconds(i[18][0]) : null,
    start_trading_dt: i[19] ? parseDatetime(i[19][0][1]) : null,
    end_trading_dt: i[19] ? parseDatetime(i[19][0][2]) : null,
    full_ticker: i[21],
  };
};

const search = async (kw) => {
  const rsp = await batchExec({ id: "mKsvE", data: [kw, [], true, true] });
  const list = (rsp[0] || [])
    .map((e) => parseDetail(e[3]))
    .filter((i) => i !== null);
  return list;
};

const listsDetail = async (ids) => {
  const rsp = outArray(
    await batchExec(
      ids.map((i) => ({
        id: "xh8wxf",
        data: [[[null, i.split(":")]], true, false],
      }))
    )
  );
  if (typeof rsp[0] === "string") {
    rsp = [rsp];
  }
  return rsp.map((e) => parseDetail(outArray(e))).filter((i) => i !== null);
};

const listsSimple = async (ids) => {
  const rsp = await batchExec({ id: "Ba1tad", data: [ids.map((i) => [i])] });
  return rsp.map((e) => ({
    currency: e[0],
    trading: parseTrading(e[1]),
    update_timestamp: DateTime.fromSeconds(e[2][0]),
    inner_id: e[3],
    has_extended: e[5],
    extended_trading: parseTrading(e[6]),
    extended_timestamp: e[7] ? DateTime.fromSeconds(e[7][0]) : null,
  }));
};

// range: 1: 1d(/min), 2: 5d(/30min), 3: 1m(/day), 4: 6m(/day), 5: ytd(/day), 6: 1y(/day), 7: 5y(/week), 8:max
const history = async (_id, _range) => {
  const rsp = await batchExec({
    id: "AiCwsd",
    data: [[[null, _id.split(":")]], _range],
  });
  return (rsp[0][3][0][1] || []).map((i) => ({
    datetime: parseDatetime([i[0]]),
    trading: parseTrading(i[1]),
    volume: i[2],
  }));
};

export default { setProxy, search, listsDetail, listsSimple, history }