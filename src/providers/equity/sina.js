import fetch from "node-fetch";
import Decimal from 'decimal.js';

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko)",
  Referer: "https://finance.sina.com.cn/",
};

const RET_N = (a) => null;

// +----------+
//    search
// +----------+
const SEARCH_TYPES = {
  11: "A 股", 12: "B 股", 13: "权证", 14: "期货", 15: "债券", 21: "开基",
  22: "ETF", 23: "LOF", 24: "货基", 25: "QDII", 26: "封基", 31: "港股",
  32: "窝轮", 33: "港指", 41: "美股", 42: "外期", 71: "外汇", 72: "基金",
  73: "新三板", 74: "板块", 75: "板块", 76: "板块", 77: "板块", 78: "板块",
  79: "板块", 80: "板块", 81: "债券", 82: "债券", 85: "期货", 86: "期货",
  87: "期货", 88: "期货", 100: "指数", 101: "基金", 102: "指数", 103: "英股",
  104: "国债", 105: "ETF", 106: "ETF", 107: "MSCI", 111: "A股", 120: "债券",
};

const SEARCH_FIELDS = ["name", "type", "code", "code_full", "name_cn"];

const search = async (kw, types = []) => {
  const results = [];
  const raw = await fetch(
    `https://suggest3.sinajs.cn/suggest/type=${types.join(",")}&key=${kw}&name=`,
    { headers }
  );
  const buffer = await raw.arrayBuffer();
  const lines = new TextDecoder('gbk').decode(buffer).split('"')[1].split(';')
  lines.forEach((line) => {
    const data = line.split(",");
    const r = Object.fromEntries(
      SEARCH_FIELDS.map((field, i) => [field, data[i]])
    );
    if (r["name"] === "" || !("name_cn" in r)) {
      return;
    }
    r["code_full"] = r["type"] + "#" + r["code_full"].replace(",", "$");
    r["type"] = SEARCH_TYPES[r["type"]];
    results.push(r);
  });
  return results;
}

// +----------+
//   realtime
// +----------+
const CN_STATUS = {
  "00": null,
  "01": "临停1H",
  "02": "停牌",
  "03": "停牌",
  "04": "临停",
  "05": "停1/2",
  "07": "暂停",
  "-1": "无记录",
  "-2": "未上市",
  "-3": "退市",
};

const REALTIME_FIELDS = {
  // A 股
  '11': [
    ["name", String], ["opening", Decimal],
    ["last_closing", Decimal], ["closing", Decimal],
    ["highest", Decimal], ["lowest", Decimal],
    ["buy", Decimal], ["sell", Decimal],
    ["volume", Decimal], ["deal", Decimal],
    ["buy1_v", Decimal], ["buy1_p", Decimal],
    ["buy2_v", Decimal], ["buy2_p", Decimal],
    ["buy3_v", Decimal], ["buy3_p", Decimal],
    ["buy4_v", Decimal], ["buy4_p", Decimal],
    ["buy5_v", Decimal], ["buy5_p", Decimal],
    ["sell1_v", Decimal], ["sell1_p", Decimal],
    ["sell2_v", Decimal], ["sell2_p", Decimal],
    ["sell3_v", Decimal], ["sell3_p", Decimal],
    ["sell4_v", Decimal], ["sell4_p", Decimal],
    ["sell5_v", Decimal], ["sell5_p", Decimal],
    ["date", String], ["time", String],
    ["status", (typ) => CN_STATUS[typ]],
  ],
  // 港股
  '31': [
    ["name_en", String], ["name", String],
    ["opening", Decimal], ["last_closing", Decimal],
    ["highest", Decimal], ["lowest", Decimal],
    ["closing", Decimal], ["delta", Decimal],
    ["percent", Decimal], ["buy", Decimal],
    ["sell", Decimal], ["volume", Decimal],
    ["deal", Decimal], ["pe", Decimal],
    ["yield_w", Decimal], ["52w_high", Decimal],
    ["52w_low", Decimal], ["date", String],
    ["time", String],
  ],
  // 美股
  '41': [
    ["name", String], ["closing", Decimal],
    ["percent", Decimal], ["", RET_N],
    ["delta", Decimal], ["opening", Decimal],
    ["highest", Decimal], ["lowest", Decimal],
    ["52w_highest", Decimal], ["52w_lowest", Decimal],
    ["volume", Decimal], ["avg_vol", Decimal],
    ["total_share", Decimal], ["eps", String],
    ["pe", String], ["", RET_N],
    ["beta", Decimal], ["dividend", String],
    ["income", String], ["shares", Decimal],
    ["", RET_N], ["after_hour_price", Decimal],
    ["after_hour_percent", Decimal],
    ["after_hour_delta", Decimal],
    ["after_hour_datetime", String],
    ["datetime", String], ["last_closing", Decimal],
    ["after_hour_volume", Decimal], ["", RET_N],
    ["year", String],
  ],
  // 外盘期货，前缀 hf_
  '86': [
    ["closing", Decimal], ["", RET_N],
    ["buy", Decimal], ["sell", Decimal],
    ["high", Decimal], ["low", Decimal],
    ["time", String], ["last_closing", Decimal],
    ["opening", Decimal], ["volume", Decimal],
    ["", RET_N], ["", RET_N],
    ["date", String], ["name", String],
  ],
  // 外汇
  '71': [
    ["time", String], ["", RET_N],
    ["", RET_N], ["last_closing", Decimal],
    ["", RET_N], ["opening", Decimal],
    ["highest", Decimal], ["lowest", Decimal],
    ["closing", Decimal], ["name", String],
    ["", RET_N], ["", RET_N],
    ["", RET_N], ["market_maker", String],
    ["", RET_N], ["", RET_N],
    ["", RET_N], ["date", String],
  ],
  // 直盘外汇，代码无前缀
  fx: [
    ["time", String], ["closing", Decimal],
    ["sell", Decimal], ["last_closing", Decimal],
    ["amplitude", Decimal], ["opening", Decimal],
    ["highest", Decimal], ["lowest", Decimal],
    ["buy", Decimal], ["name", String],
    ["date", String],
  ],
  // 中行牌价，前缀 h_RMB
  pj: [
    ["name", String], ["exchange_buy", Decimal],
    ["cash_buy", Decimal], ["exchange_sell", Decimal],
    ["cash_sell", Decimal], ["parity", Decimal],
    ["date", String], ["time", String],
  ],
  // 开放式基金估值 21
  fu: [
    ["name", String], ["time", String],
    ["estimation", Decimal], ["net_worth", Decimal],
    ["net_accumulate", Decimal], ["increase_rate_5m", Decimal],
    ["percent", Decimal], ["date", String],
  ],
  // QDII 基金 25（基础基金接口）
  f: [
    ["name", String], ["net_worth", Decimal],
    ["net_accumulate", Decimal], ["last_net", Decimal],
    ["date", String], ["volume", Decimal],
  ],
};

const getParsedSymbol = (typ, code) =>{
  switch (typ) {
    case '11':
      return code;
    case '31': case '33':
      return 'rt_hk' + code.toUpperCase();
    case '41':
      return 'gb_' + code.toLowerCase();
    case '86': 
      return 'hf_' % + code.toUpperCase();
    case '71': 
      return 'fx_s' + code.toLowerCase();
    case 'fx': 
      return code.toUpperCase();
    case 'pj': 
      return 'h_RMB' + code.toUpperCase();
    case 'fu': 
      return 'fu_' + code.toLowerCase();
    case 'f': 
      return 'f_' + code.toLowerCase();
    default:
      return;
  }
};

const realtime = async (codes) => {
  const symbolList = [];
  const items = codes.map(code => {
    const typeCode = code.split('#');
    symbolList.push(getParsedSymbol(...typeCode));
    return [code, REALTIME_FIELDS[typeCode[0]]];
  });
  const raw = await fetch('http://hq.sinajs.cn/?list=' + symbolList.join(","), {
    headers,
  });
  const buffer = await raw.arrayBuffer();
  const lines = new TextDecoder('gbk').decode(buffer).trim().split('\n');
  const results = lines.map((line, i) => {
    const [code, fields] = items[i];
    const entries = line.split('"')[1].split(',').map((val, ii) => {
      if (ii >= fields.length) return null;
      const [k, f] = fields[ii];
      if (k === '') return null;
      return [k, f(val)];
    }).filter(e => !!e);
    const ret = Object.fromEntries(entries);
    ret.code_full = code;
    return ret;
  });
  return results;
}

export default { search, realtime }