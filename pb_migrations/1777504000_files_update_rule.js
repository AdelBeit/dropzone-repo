/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("files");
    collection.updateRule = "@request.auth.id = owner.id";
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("files");
    collection.updateRule = null;
    return app.save(collection);
  }
);
