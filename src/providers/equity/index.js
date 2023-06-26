import sina from './sina-interface.js';
import gfinance from './gfinance-interface.js';

const setProxy = (url) => {
  gfinance.setProxy(url);
};

export default { setProxy, sina, gfinance };
