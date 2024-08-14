# Bienvenidx al proyecto ${DISPLAY_PROJECT_NAME}

Este proyecto usa la tecnología de React Remix:
- [Remix Docs](https://remix.run/docs)
- [Remix + Preprocessors Docs](https://remix.run/docs/en/1.18.1/guides/styling#css-preprocessors)
- [Remix + LESS Docs](https://www.npmjs.com/package/less-watch-compiler)

## Modo desarrollo. 

Para iniciar el proyecto en modo desarrollo, ejecuta lo siguiente desde tu terminal:

```sh
npm run dev
```

Esto iniciará la app en modo desarrollo, lo que implica que se rebuildeará cada vez que cambies algo del proyecto.

También iniciará SASS en modo "Watch" para actualizar los CSS a medida que se editen los ficheros SCSS de los componentes.

### Creación de elementos.
Para crear elementos, tenemos disponible el comando:

#### Creación simple.

```sh
npm run create-element
```

Este iniciará un menú interactivo desde el cual podremos crear:

* Rutas.
* Componentes.

#### Creación múltiple.
También es posible crear elementos de forma masiva, mediante el comando:

```sh
npm run create-elements
```

Este abrirá una ventana de editor de texto donde tendremos que indicar una lista de nombres de cada uno de los elementos que queramos crear, separados por comas; por ejemplo:

```
Button, VideoPlayer, AudioPlayer, Switch, Waves
```

Actualmente SOLO FUNCIONA CON COMPONENTES.

## Modos de producción.
Generalmente, no tendremos que preocuparnos de esto. Los despliegues ya se realizan automáticamente dependiendo de la rama en la que se hagan cambios:

* rama _develop_: despliegará en pre-producción.
* rama _main_: despliegará en producción.

En caso de necesitarlo, aquí están los scripts para cada entorno.

### Pre-producción.
Para iniciar el proyecto en modo de pre-producción, primero tendremos que buildear el mismo:

```sh
npm run build:staging
```

Una vez buildeado, lo iniciamos:

```sh
npm run staging
```

### Producción.
Para iniciar el proyecto en modo de pre-producción, primero tendremos que buildear el mismo:

```sh
npm run build:production
```

Una vez buildeado, lo iniciamos:

```sh
npm run production
```

----------

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `remix build`

- `build/`
- `public/build/`