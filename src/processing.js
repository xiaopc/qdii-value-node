import { DateTime } from 'luxon';
import { Decimal } from 'decimal.js';

import { reS } from './utils/index.js';

let equityProviders = null;
const setEquityProviders = (o) => equityProviders = o;

// 以每日此时间前收盘作为交易日分界
const TRADING_START_HOUR = 8;
const tz = 'Asia/Shanghai';

const getDataFromProvider = async (provider, equities) => {
  const sourceIds = equities.map((e) => e.source_id);
  const result = await provider.realtime(sourceIds);
  const ret = reS(equities);
  ret.forEach(item => {
    const itemRes = result.filter(r => r.source_id === item.source_id);
    if (itemRes.length === 0) return;
    Object.assign(item, itemRes[0]);
  });
  return ret;
}

const fetchSingleHistory = async (provider, equity, ...args) => {
  return { ...equity, history: await provider.history(equity.source_id, ...args) };
};

const fetchHistoryFromProvider = async (provider, equities, ...args) => {
  const promises = equities.map(e => fetchSingleHistory(provider, e, ...args));
  return (await Promise.allSettled(promises)).map(p => p.value);
}

const getTradeDay = dt => DateTime.fromObject(
  {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: TRADING_START_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  }, { zone: tz }
);

const combineSummary = (unflattened, equitiesPercent) => {
  const equities = unflattened.flat().filter(e => !!e.change_percent);

  const now = DateTime.now().setZone(tz);
  let tradeToday = getTradeDay(now);
  if (now < tradeToday) {
    tradeToday = tradeToday.minus({ days: 1 });
  }
  const lastUpdate = equities.reduce(
    (max, e) => (max.diff(e.time).toObject().milliseconds < 0 ? e.time : max),
    DateTime.fromSeconds(0, { zone: tz })
  );
  const lastDay = getTradeDay(lastUpdate).minus({ days: now.weekday === 1 ? 3 : 1 });  
  equities.map(e => {
    e.weight = new Decimal(e.weight);
    e.is_today = tradeToday.diff(e.time).toObject().milliseconds < 0;
    e.is_past = lastDay.diff(e.time).toObject().milliseconds > 0;
  });
  equities.sort((a, b) => b.weight.cmp(a.weight));

  const totalWeight = equities.reduce((acc, e) => acc.plus(e.weight), new Decimal(0));
  const todayEquities = equities.filter((e) => e.is_today);
  let todayW = new Decimal(0), todayP = new Decimal(0), totalP;
  if (todayEquities.length > 0) {
    todayW = todayEquities.reduce((acc, e) => acc.plus(e.weight), new Decimal(0));
    todayP = todayEquities.reduce(
      (acc, e) => acc.plus(e.weight.times(e.change_percent).dividedBy(100)),
      new Decimal(0)
    );
    totalP = todayP.dividedBy(totalWeight.dividedBy(100));
    todayP = todayP.dividedBy(todayW.dividedBy(100));
  } else {
    const notPastEquities = equities.filter((e) => !e.is_past);
    totalP = notPastEquities.reduce(
      (acc, e) => acc.plus(e.weight.times(e.change_percent).dividedBy(100)),
      new Decimal(0)
    );
    totalP = totalP.dividedBy(totalW.dividedBy(100));
  }
  return [
    equities,
    {
      last_update: lastUpdate,
      total_weight: totalWeight,
      total_percent: totalP.times(equitiesPercent).dividedBy(100),
      today_weight: todayW,
      today_percent: todayP.times(equitiesPercent).dividedBy(100),
    },
  ];
}

const singleFetch = async (equity) => {
  const provider = equityProviders[equity.source];
  return (await getDataFromProvider(provider, [equity]))[0];
}

const divideByProvider = (equities) => {
  const ret = Object.fromEntries(Object.keys(equityProviders).map(k => [k, []]));
  equities.forEach(e => ret[e.source].push(e));
  return Object.entries(ret).filter(pair => pair[1].length > 0);
}

const fetch = async (equities, equitiesPercent = '100') => {
  if (equities.length === 0) {
    return [null, null];
  }
  const divided = divideByProvider(equities);
  const promises = divided.map(pair => {
    const [provider, equities] = pair;
    return getDataFromProvider(equityProviders[provider], equities);
  });
  const ret = (await Promise.allSettled(promises)).map(p => p.value);
  return combineSummary(ret, new Decimal(equitiesPercent));
}

const fetchHistory = async (equities, ...args) => {
  if (equities.length === 0) {
    return null;
  }
  const d = divideByProvider(equities);
  const promises = d.map(pair => {
    const [provider, equities] = pair;
    return fetchHistoryFromProvider(equityProviders[provider], equities, ...args);
  });
  return (await Promise.allSettled(promises)).map(p => p.value).flat();
}

export default { setEquityProviders, singleFetch, fetch, fetchHistory };