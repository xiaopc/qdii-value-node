import gfinance from './gfinance.js';
import Decimal from 'decimal.js';
import { DateTime } from 'luxon';

const tz = 'Asia/Shanghai';

const setProxy = gfinance.setProxy;

const search = async (kw, _type=null) => {
    const res = await gfinance.search(kw);
    if (!Array.isArray(res)) return []
    return res.map(i => ({
        'source_id': i['full_ticker'],
        'code': i['code'],
        'name': i['name'],
        'type': i['market']
    }));
}

const realtime = async (ids) => {
    const now = DateTime.now().setZone(tz);
    if (ids.length == 0) {
        return [];
    }
    const res = await gfinance.listsDetail(ids);
    const ret = [];
    for (const i of res) {
        const c = {
            'source_id': i['full_ticker'],
            'source_name': i['name'],
            'last': new Decimal(i['trading']['last']),
            'change': new Decimal(i['trading']['change']),
            'change_percent': new Decimal(i['trading']['change_percent']),
            'time': i['last_timestamp'].setZone(tz),
        };
        c['is_open'] = i['end_trading_dt'] === null || (now < i['end_trading_dt'].setZone(tz) && now > i['start_trading_dt'].setZone(tz));
        if (c['is_open'] === false && i['extended_trading'] !== null) {
            c['after_hour_price'] = new Decimal(i['extended_trading']['last']);
            c['after_hour_percent'] = new Decimal(i['extended_trading']['change_percent']);
            c['after_hour_change'] = new Decimal(i['extended_trading']['change']);
            c['after_hour_datetime'] = i['extended_timestamp'].setZone(tz);
        }
        ret.push(c);
    }
    return ret;
}

const history = async (_id, limit=21) => {
    const resp = (await gfinance.history(_id, 3)).map(i => ({
        'date': i['datetime'].setZone(tz).toFormat('yyyy-MM-dd'),
        'close': i['trading']['last'],
        'change': i['trading']['change'],
        'change_percent': i['trading']['change_percent'],
        'volume': i['volume'],
    }));
    return resp.slice(-limit);
}

export default { setProxy, search, realtime, history }