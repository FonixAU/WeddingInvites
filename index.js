import 'dotenv/config';
import express from 'express';
import { engine } from 'express-handlebars';
import { createDirectus, staticToken, rest, createItem, readItem, updateItem } from '@directus/sdk';
const directus = createDirectus(process.env.DIRECTUS_URL)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_TOKEN));

const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/', (req, res) => {
  res.render('save', { layout: false });
});

app.get('/:slug', async (req, res) => {
  try{
    const data = await directus.request(
      readItem('invites', req.params.slug, { 
        fields: ['*', { people: [ 'id', 'first_name', 'last_name' ] }] 
      })
    );
    res.render('invite', { layout: false, ...data });
  }catch(e){
    console.error(e);
  }

});

app.post('/rsvp', async (req, res) => {
  try{
      // Get list of RSVP IDs
  const rsvps = Object.keys(req.body)
  .filter(k => k.includes('rsvp'))
  .map(k => k.split('rsvp-')[1]);

// Update people with RSVPs
for(let rsvp of rsvps) {
  await directus.request(
    updateItem('people', rsvp, { 
      rsvp: req.body[`rsvp-${rsvp}`],
      requirements: req.body[`requirements-${rsvp}`],
      food_option: req.body[`food-option-${rsvp}`]
    })
  );
}

// Add +1 if exists
if(req.body['first-name-plus-one']) {
  const { id } = await directus.request(
    createItem('people', {
      first_name: req.body['first-name-plus-one'],
      last_name: req.body['last-name-plus-one'],
      requirements: req.body['requirements-plus-one'],
      food_option: req.body['food-option-plus-one'],
      is_plus_one: true,
      rsvp: "Coming",
    })
  );
  rsvps.push(id);
}

// Update invite
await directus.request(
  updateItem('invites', req.body.slug, { 
    email: req.body.email,
    phone: req.body.phone,
    people: rsvps,
    completed: new Date()
  })
);

res.redirect(`/invite/${req.body.slug}`);
  }
  catch(e){
    console.error(e);
  }
});

app.listen(3000);