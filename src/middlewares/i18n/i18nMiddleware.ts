import { NextFunction, Request, Response } from 'express';
import i18n from '../../config/i18n';

export default function i18nMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  i18n.init(req, res);

  // Set locale based on the 'lang' header if available, otherwise fall back to default
  const locale = Array.isArray(req.headers.lang)
    ? req.headers.lang[0]
    : req.headers.lang || i18n.getLocale();
  i18n.setLocale(req, locale as string);
  i18n.setLocale(res, locale as string);

  // Attach the `__` method to `res.locals` for use in views
  res.locals.__ = res.__;

  next();
}
