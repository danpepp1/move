// First-run starter content: a sensible moving checklist you can edit or delete.
// Each block only seeds if its table is empty, so it never clobbers your data.

const STARTER_ROOMS = [
  {
    name: 'Bedroom',
    items: [
      ['Bed frame', 250], ['Mattress', 500], ['Dresser', 180],
      ['Nightstand', 60], ['Bedding set', 90], ['Lamp', 30],
    ],
  },
  {
    name: 'Living Room',
    items: [
      ['Couch', 700], ['TV', 450], ['TV stand / mount', 120],
      ['Coffee table', 120], ['Rug', 100], ['Floor lamp', 45],
    ],
  },
  {
    name: 'Kitchen',
    items: [
      ['Pots & pans set', 120], ['Dishes & bowls', 60], ['Silverware set', 30],
      ['Knife set', 50], ['Microwave', 80], ['Trash can', 25], ['Coffee maker', 40],
    ],
  },
  {
    name: 'Bathroom',
    items: [
      ['Shower curtain + liner', 25], ['Bath towels', 40],
      ['Bath mat', 20], ['Plunger + brush', 15], ['Trash can', 15],
    ],
  },
  {
    name: 'Office',
    items: [
      ['Desk', 200], ['Office chair', 180], ['Monitor', 200], ['Surge protector', 25],
    ],
  },
];

const STARTER_DATES = [
  ['Lease start', null, 'When you can pick up keys'],
  ['U-Haul / truck pickup', null, 'Book early — weekends fill up'],
  ['Move day', null, 'The big one'],
  ['Utilities on (power/internet)', null, 'Schedule before move-in'],
];

const STARTER_PACKING = [
  ['Order furniture with lead time', '3 weeks out'],
  ['Box books, décor, off-season clothes', '2 weeks out'],
  ['Pack closet + anything non-essential', '1 week out'],
  ['Confirm truck + change address (USPS)', '1 week out'],
  ['Pack the kitchen', '2 days out'],
  ['Essentials bag (chargers, meds, toiletries, docs)', 'Move day'],
];

const STARTER_TASKS = [
  ['Mount the TV', 'stud finder, drill, level, socket set'],
  ['Assemble the bed frame', 'Allen keys, drill'],
  ['Assemble the desk', 'Allen keys, screwdriver'],
  ['Hang curtains / blinds', 'drill, level, tape measure'],
  ['Set up wifi router', ''],
  ['Hang shelves / art', 'stud finder, drill, level, anchors'],
];

export function seedIfEmpty(db) {
  const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;

  if (count('rooms') === 0) {
    const insRoom = db.prepare('INSERT INTO rooms (name, sort_order) VALUES (?, ?)');
    const insItem = db.prepare(
      'INSERT INTO items (room_id, name, est_price, sort_order) VALUES (?, ?, ?, ?)'
    );
    db.transaction(() => {
      STARTER_ROOMS.forEach((room, ri) => {
        const { lastInsertRowid: roomId } = insRoom.run(room.name, ri);
        room.items.forEach(([name, est], ii) => insItem.run(roomId, name, est, ii));
      });
    })();
  }

  if (count('key_dates') === 0) {
    const ins = db.prepare('INSERT INTO key_dates (label, date, notes, sort_order) VALUES (?, ?, ?, ?)');
    db.transaction(() => STARTER_DATES.forEach((d, i) => ins.run(d[0], d[1], d[2], i)))();
  }

  if (count('packing') === 0) {
    const ins = db.prepare('INSERT INTO packing (label, timing, sort_order) VALUES (?, ?, ?)');
    db.transaction(() => STARTER_PACKING.forEach((p, i) => ins.run(p[0], p[1], i)))();
  }

  if (count('tasks') === 0) {
    const ins = db.prepare('INSERT INTO tasks (label, tools, sort_order) VALUES (?, ?, ?)');
    db.transaction(() => STARTER_TASKS.forEach((t, i) => ins.run(t[0], t[1], i)))();
  }
}
