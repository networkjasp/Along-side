// Starting content, used until the first save in the Website Manager.
import portfolio from '../../content/portfolio.json' with { type: 'json' };
import founder from '../../content/founder.json' with { type: 'json' };

export const defaults = { portfolio: portfolio.items, founder };
