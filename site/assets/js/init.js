/* Runs in <head> before first paint. Marks that JavaScript is available so
   scroll-reveal styles only hide content when the script that reveals it can
   actually run. Kept external so the CSP can forbid inline scripts. */
document.documentElement.classList.add('js');
