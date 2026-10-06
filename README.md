# Majh & Aaron Wedding

This is a Laravel 13 application with static wedding and admin pages in `public/` and JSON APIs served by Laravel. It is a PHP application, not a Node server.

## Runtime requirements

- PHP 8.4 recommended (PHP 8.3 is the framework minimum)
- Composer 2
- MySQL in production, or SQLite for local development
- Node.js 20.19+ only when rebuilding the optional Vite starter assets

There is intentionally no `npm start` command. Forge serves the application through Nginx and PHP-FPM. The checked-in wedding pages load `/css/wedding.css`, `/css/admin.css`, `/js/wedding.js`, and `/js/admin.js` directly from `public/`; they do not use the Vite build output.

## Local setup

PowerShell:

```powershell
composer install
Copy-Item .env.example .env
New-Item -ItemType File -Path database/database.sqlite -Force
php artisan key:generate
php artisan migrate:fresh --seed
npm ci
npm run build
php artisan serve
```

Open `http://127.0.0.1:8000`. The admin portal is at `http://127.0.0.1:8000/admin/`.

`SEED_DEMO_DATA=true` creates the example guests and RSVPs locally. When `ADMIN_PASSWORD` is blank outside production, the local fallback is `WeddingAdmin2026!`.

The Vite commands prove the Node toolchain works, but they are not required to render the current wedding pages. For day-to-day work, `php artisan serve` is enough unless `resources/css/app.css` or `resources/js/app.js` is connected to a Blade view later.

## Forge site settings

Create the Forge site as a PHP / Laravel site with:

- PHP version: 8.4
- Web directory: `/public`
- A MySQL database and database user assigned to the site
- SSL enabled before setting `SESSION_SECURE_COOKIE=true`

In Forge's Environment editor, copy `.env.forge.example`, then replace every example domain, database value, email, and password. Generate `APP_KEY` from the Forge site's command runner:

```bash
php artisan key:generate --show
```

Paste the returned value into `APP_KEY`. Do not commit the populated Forge environment file.

`ADMIN_PASSWORD` is required the first time the production database is seeded. Use a long unique value. `SEED_DEMO_DATA=false` prevents the example guest and RSVP records from being added in production.

## Forge deployment script

Use this in Forge's Deploy Script editor, replacing the first path with the site's actual root directory:

```bash
cd /home/forge/example.com

git pull origin "$FORGE_SITE_BRANCH"

$FORGE_COMPOSER install --no-dev --no-interaction --prefer-dist --optimize-autoloader

$FORGE_PHP artisan config:clear
$FORGE_PHP artisan migrate --force
$FORGE_PHP artisan optimize

( flock -w 10 9 || exit 1
    echo 'Restarting PHP-FPM...'
    sudo -S service "$FORGE_PHP_FPM" reload
) 9>/tmp/fpmlock
```

Run this once after the first successful migration to create the initial wedding content and admin account:

```bash
php artisan db:seed --force
```

Do not add `npm start`, `npm run dev`, or a Node daemon. If the application is later changed to reference Vite assets, add these two build commands before `php artisan optimize`:

```bash
npm ci
npm run build
```

## Deployment checks

After deployment, check:

- `https://your-domain.example/up` returns HTTP 200.
- `https://your-domain.example/api/public/wedding-info` returns JSON.
- `https://your-domain.example/admin/` displays the admin login.
- `storage/` and `bootstrap/cache/` are writable by the Forge site user.
- Forge's deployment output has no database authentication, missing `APP_KEY`, or PHP version errors.

If the home page loads but wedding data does not, the static HTML is working while Laravel or MySQL is not. Check the public API URL above and inspect `storage/logs/laravel.log` on the server.
