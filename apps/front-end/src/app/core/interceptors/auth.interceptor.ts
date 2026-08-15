import { HttpInterceptorFn } from '@angular/common/http';
import { TOKEN_STORAGE_KEY } from '../auth.storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
