db = db.getSiblingDB('chatapp');

db.createUser({
  user: 'tutorialdbuser',
  pwd: 'PaZcch2qS0ttPSob',
  roles: [
    {
      role: 'readWrite',
      db: 'chatapp'
    }
  ]
});

db.createCollection('users');
db.createCollection('messages');