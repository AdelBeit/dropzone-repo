/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("files");

    collection.fields.add(new AutodateField({
      id: "autodate2990389176",
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));

    collection.fields.add(new AutodateField({
      id: "autodate3332085495",
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("files");

    collection.fields.removeById("autodate2990389176");
    collection.fields.removeById("autodate3332085495");

    return app.save(collection);
  }
);
