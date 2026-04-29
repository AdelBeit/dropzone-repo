/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const collection = new Collection({
      type: "base",
      name: "files",
      listRule: "@request.auth.id = owner.id",
      viewRule: "@request.auth.id = owner.id",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: "@request.auth.id = owner.id",
      fields: [
        {
          type: "file",
          name: "file",
          required: true,
          maxSelect: 1,
          maxSize: 104857600,
        },
        {
          type: "relation",
          name: "owner",
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          type: "number",
          name: "file_size",
        },
        {
          type: "text",
          name: "file_name",
        },
      ],
    });

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("files");
    app.delete(collection);
  }
);
