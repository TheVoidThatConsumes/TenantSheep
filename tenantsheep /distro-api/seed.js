require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Org = require('./models/Org');
const Operator = require('./models/Operator');
const Campaign = require('./models/Campaign');

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/tenantsheep_distro';
  await mongoose.connect(uri);

  await Promise.all([Org.deleteMany({}), Operator.deleteMany({}), Campaign.deleteMany({})]);

  const [orgA, orgB] = await Org.create([{ name: 'Acme Media' }, { name: 'Borealis Co' }]);
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await Operator.create([
    { email: 'alice@acme.test', passwordHash, orgId: orgA._id, role: 'operator' },
    { email: 'bob@borealis.test', passwordHash, orgId: orgB._id, role: 'operator' },
  ]);

  // Acme Media -- campaigns built from the Q4 launch and holiday email
  // projects (create-api seed IDs 1 and 2, same org). sourceProjectId ties
  // the two services together narratively without any real network call.
  await Campaign.create([
    {
      name: 'Q4 Product Launch -- Social Push',
      description: 'Multi-channel social push for the Q4 launch video.',
      orgId: orgA._id,
      status: 'active',
      channel: 'social',
      sourceProjectId: '1',
    },
    {
      name: 'Holiday Email Sequence -- Wave 1',
      description: 'First send of the five-email holiday sequence.',
      orgId: orgA._id,
      status: 'draft',
      channel: 'email',
      sourceProjectId: '2',
    },
  ]);

  // Borealis Co -- a campaign built from the spring lookbook project
  // (create-api seed ID 4, Borealis's first project).
  await Campaign.create([
    {
      name: 'Spring Collection -- Influencer Drop',
      description: 'Influencer seeding ahead of the spring collection launch.',
      orgId: orgB._id,
      status: 'active',
      channel: 'social',
      sourceProjectId: '4',
    },
  ]);

  console.log('Seeded distro-api. Logins:');
  console.log('  alice@acme.test / Password123!  (Acme Media)');
  console.log('  bob@borealis.test / Password123! (Borealis Co)');
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
