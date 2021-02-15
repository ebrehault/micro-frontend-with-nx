# Angular micro-frontends with Nx

Implement micro frontends in Angular using Nx

Monolithic single-page apps may go unnoticed by users, especially if the app is split in reasonably small bundles that are lazy loaded. However, they remain a tough one for developers to maintain. Imagine how they feel when they need to build and run the full app even if they’re only working on a small part of it. On top of that, not being able to delegate the responsibility of a given feature to a specific team makes the monolithic approach not very scalable for project managers.

Good news is that micro frontends are here to save your life by mitigating the maintenance and developer experience issues. Instead of building a unique app, you can build a collection of small apps - micro frontends - that are developed independently but can be dynamically plugged into the main app.

What you need to implement micro frontends

To set up micro frontends, the code of your main app must be able to reference an external component. This component should be ignored at build time but it should trigger the loading and running of the corresponding micro frontend bundle.

You can achieve that thanks to [webpack 5's module federation](https://webpack.js.org/concepts/module-federation/), which is available as an experimental feature since Angular 11.

Without further ado, let’s look at how you can enable webpack 5 and implement micro frontends in an [Nx](https://nx.dev/)-based project.

## Setup your project

First, create an Nx project:‌

```
npx create-nx-workspace@latest micronx
```

‌Then generate two apps in the project you just created. For example, `dashboard` can be your main app and `admin` the micro frontend app that will be plugged into the main app.

```
ng generate @nrwl/angular:application --name=dashboard
ng generate @nrwl/angular:application --name=admin
```

Finally, in `admin` , create a module with a component and allow routing for it. The component in the example is `called AdminPanelModule`.

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
export class AdminPanelModule {}‌
```

## Enable module federation

To enable module federation for your 2 apps you can use `@angular-architects/module-federation`.

Add the webpack configuration files to each app and specify the ports where they are served in developer mode.

```
ng add @angular-architects/module-federation --project dashboard --port 4200
ng add @angular-architects/module-federation --project admin --port 4201
```

Then, switch to webpack 5. Do so by adding this line to your `package.json`:‌

```json
"resolutions": { "webpack": "5.0.0"}
```

Now, run the app using `yarn`.

```
yarn
```

Keep in mind that `npm` doesn't support `resolutions`. This is why you should use `yarn`. Additionally, some Nx commands might trigger an npm command and that could break the webpack 5 dependencies. If that happens, run `yarn` again.

## Configure webpack

In `admin` (your micro frontend app), modify `apps/admin/webpack.config.js` to expose `AdminPanelModule` as a remote module named `admin`.

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

In `dashboard` (your main app), declare `admin` as a micro frontend using remotes.

```ts
      remotes: {
        admin: 'admin@http://localhost:4201/remoteEntry.js',
      },
```

## Plug the micro frontend app into the main app

Now you can declare a route in your main app that targets the remote micro frontend.

Add this code to `apps/dashboard/src/app/app.module.ts`:‌

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

Now, you can plug the route where you need. For example, in the component’s HTML file such as `apps/dashboard/src/app/app.component.html`.‌

```html
<h1>Dashboard</h1>
<div>
  <a routerLink="/admin-panel">Go to admin</a>
</div>
<router-outlet></router-outlet>
```

## Run the apps

When you’re done configuring, run the two apps. You can do that by running these commands in two terminal instances.

```
nx serve dashboard
nx serve admin
```

Now, check that everything works.

Open the main app by going to your local server’s address. For example, `http://localhost:4200`.

When you click on the Go to admin, the micro-frontend app `AdminPanelComponent` should be properly render. Also, if you check the Network tab of your browser’s debugging tools, it should come from the port where the app is being served, such as 4201.

## Running in production

Now it’s time to run your micro-frontend in a production environment.

Build the admin app.

```
nx build admin --prod
```

Update the URLs of your local server in the code with the URL of your production server, then deploy the app there. In the examples, this means replacing `http://localhost:4201` with your production URL. For example, `https://my-prod-server.net/admin/`.

One way is to create specific configuration files for production that will override the basic configuration when running in production mode. For example:

- Create a file called `apps/dashboard/webpack.prod.config.js` that will override the configuration `in apps/dashboard/webpack.config.js`
- In your `apps/dashboard/src/environments` folder, create a file called `environment.prod.ts` that will override the configuration in `apps/dashboard/src/app/app.module.ts`
- You can also create a secondary configuration file called `environment.remote.ts` that will allow you to run the main app locally in dev mode while using the remote micro frontend from production

These instructions should give you enough to get started, but if you want more information, you can check out the full code here.

Read the corresponding ["Implement micro frontends in Angular using Nx" blog article](https://onna.dev/implement-micro-frontends-in-angular-using-nx/)
