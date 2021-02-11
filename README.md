# Angular micro-frontends with Nx

Having gigantic monolithic single-page apps is definitely not nice. It might not impact our users because we can split the app in reasonably small bundles we lazy-load. But it does impact badly the developer experience (as people working on the app will have to build and run the full app even though they work on a small part of it), and it is totally not scalable, it restricts the ability to efficiently delegate responsibility of a given feature to a given team.

A good way to mitigate this problem is to use micro-frontends: instead of building a unique app, we build a collection of apps (called micro-frontends), they are developed independently, but they can be dynamically plugged into the main app.

To achieve that, we need to be able to reference an external component within our main app code, it should be ignored at build time, but at runtime, it will trigger the loading and execution of the corresponding micro-frontend bundle.

That is what provides [Webpack 5 module federation](https://webpack.js.org/concepts/module-federation/).

And since Angular 11, we can use Webpack 5! (note: support is still flagged as experimental though).

We will detail here the steps to enable it and implement micro-frontend in an [Nx](https://nx.dev/)-based project.

## Initial setup

Let's create an Nx project:

```
npx create-nx-workspace@latest micronx
```

We will generate 2 apps in this project:

- `dashboard`: it will be our main app
- `admin`: that is our micro-frontend app we will build separately and call from `dashboard`

In `admin`, we just create an `AdminPanelModule` module with a component and allowing to route to this component:

```ts
const routes: Routes = [
  {
    path: '',
    component: AdminPanelComponent,
  },
];

@NgModule({
  declarations: [AdminPanelComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminPanelModule {}
```

## Enable module federation

First we need to configure our 2 apps for module federation. We will use `@angular-architects/module-federation`:

```
ng add @angular-architects/module-federation --project dashboard --port 4200
ng add @angular-architects/module-federation --project admin --port 4201
```

It will add the webpack configuration files to each apps and specify on which ports we want to serve them on dev mode.

Then, we need to switch to Webpack 5. We do so by adding the following in our `package.json`:

```json
"resolutions": {
    "webpack": "5.0.0"
}
```

And then run:

```
yarn
```

Important note: `resolutions` is not supported by `npm` for now, so we have to use `yarn`. Be careful, some Nx commands might trigger an `npm` command, and that would pollute our webpack 5 dependencies (it is does happen, just run `yarn` again).

## Configure webpack

In `admin` (our micro-frontend app), we modify the generated `apps/admin/webpack.config.js` files so we expose the `AdminPanelModule` module, and we name it `admin`:

```ts
    new ModuleFederationPlugin({
      name: 'admin',
      filename: 'remoteEntry.js',
      exposes: {
        './Module': './apps/admin/src/app/admin-panel/admin-panel.module.ts',
      },
      shared: {
        '@angular/core': { singleton: true, strictVersion: true },
        '@angular/common': { singleton: true, strictVersion: true },
        '@angular/router': { singleton: true, strictVersion: true },

        ...sharedMappings.getDescriptors(),
      },
    }),
```

In `dashboard` (our main app), we declare `admin` in our possible remotes micro-frontends:

```ts
      remotes: {
        admin: 'admin@http://localhost:4201/remoteEntry.js',
      },
```

## Calling the micro-frontend app from the main app

We are now allowed to declare a route in our main app that will target our remote micro-frontend. Let's add the following in `apps/dashboard/src/app/app.module.ts`:

```ts
const routes: Route[] = [
  {
    path: 'admin-panel',
    loadChildren: () =>
      loadRemoteModule({
        remoteEntry: 'http://localhost:4201/remoteEntry.js',
        remoteName: 'admin',
        exposedModule: './Module',
      }).then((m) => m.AdminPanelModule),
  },
];
```

And let's use the route in `apps/dashboard/src/app/app.component.html`:

```html
<h1>Dashboard</h1>
<div>
  <a routerLink="/admin-panel">Go to admin</a>
</div>
<router-outlet></router-outlet>
```

## Running the 2 apps

In a terminal we launch:

```
nx serve dashboard
```

And in another one we launch:

```
nx serve admin
```

When going to our main app on `http://localhost:4200`, if we click on the `Go to admin` link, we do see our AdminPanelComponent properly rendered and if we check our Network tab in our debugger we do see it comes from the 4201 port.

## Running in production

We can build `admin`:

```
nx build admin --prod
```

And then deploy it somewhere (let's say `https://my-prod-server.net/admin/`).
We just have to fix the 2 places where we mentioned `http://localhost:4201` to replace it with `https://my-prod-server.net/admin/`:

- the one in `apps/dashboard/webpack.config.js` might be fixed in `apps/dashboard/webpack.prod.config.js`
- the one in `apps/dashboard/src/app/app.module.ts` can managed from our `apps/dashboard/src/environments`: we will use `https://my-prod-server.net/admin/` in `environment.prod.ts`, but maybe also in a secondary one, `environment.remote.ts`, so we could run the main app locally in dev mode while using the remote micro-frontend from production).
