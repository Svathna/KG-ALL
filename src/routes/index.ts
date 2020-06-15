import { Router } from 'express';
const app = Router();

import user from './user';
import company from './company';
import moc from './moc';
import dot from './dot';
import doc from './doc';

app.use('/user', user);
app.use('/company', company);
app.use('/moc', moc);
app.use('/dot', dot);
app.use('/doc', doc);

export default app;
