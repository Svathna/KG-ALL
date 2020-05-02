import { Router } from 'express';
const mongoose = require('mongoose');
import requires from '../../middleware/requires';
const _ = require('lodash');
import { withAuth } from '../../middleware/withAuth';
import { InstanceType } from 'typegoose';
import User, { UserType } from '../../models/definitions/User';
import { validateString } from '../../middleware/validateString';
import { validateEmail } from '../../middleware/validateEmail';
import { validatePassword } from '../../middleware/validatePassword';
import { UserModel } from '../../models';
import { validateUserType } from '../../middleware/validateUserType';
import { withAuthAdmin } from '../../middleware/withAuthAdmin';
const { validationResult } = require('express-validator/check');
const cloudinary = require('cloudinary').v2;
const upload = require('../../config/multer');
// get the router
const app = Router();

/**
 * GET: Get all users `/user`
 */
app.get('/', withAuthAdmin, async (req, res) => {
  // get user from req acquired in with auth middleware
  const users = await UserModel.find({ deleted: false, type: 2 }).populate({
    path: 'company',
    match: { deleted: false },
  });
  // sanity check for user
  if (users.length === 0) {
    return res.status(400).json({ success: false, message: 'Users do not exist in the Database' });
  }
  // send the user back
  return res.json({ users, success: true, message: 'Success' });
});

/**
 * GET: Get one user `/user/:id`
 */
// app.get('/:id', withAuth, requires({ params: ['id'] }), async (req, res) => {
//   const { id } = req.params;
//   // get user with id
//   const user = await UserModel.findOne({ _id: id, deleted: false });
//   // sanity check for user
//   if (!user) {
//     return res.status(400).json({ success: false, message: 'Users do not exist in the Database' });
//   }
//   // send the user back
//   return res.json({ user, success: true });
// });

// /**
//  * GET: Get users by type `/user/type`
//  */
// app.post('/type', withAuth, requires({ body: ['type'] }), async (req, res) => {
//   const { type } = req.body;
//   // get user from req acquired in with auth middleware
//   const users = await UserModel.find({ type, deleted: false });
//   // check if not users
//   if (!users) {
//     res.status(400).json({
//       success: false,
//       message: 'There is no user',
//     });
//   }
//   if (users.length === 0) {
//     return res.json({ users, success: true, message: 'There is no user' });
//   }
//   // send the user back
//   return res.json({ users, success: true, message: 'Success find user' });
// });

// /**
//  * GET: Get current user `/user/current`
//  */
// app.get('/current', withAuth, (req, res) => {
//   // get user from req acquired in with auth middleware
//   const user = (req as any).user as InstanceType<User>;
//   // sanity check for user
//   if (!user) return res.status(400).json({ success: false, message: "Can't get current user" });
//   // send the user back
//   return res.json({ success: true, message: user.getUserSafe() });
// });

// /**
//  * POST: Login a user `/user/login`
//  */
// app.post('/login', requires({ body: ['email', 'password'] }), async (req, res) => {
//   // get this
//   const { email, password, registrationToken } = req.body;
//   // try
//   try {
//     // find the user and don't return the isAdmin flag
//     const user = (await UserModel.findOne({ email })) as InstanceType<User>;
//     // sanity check for user
//     if (!user) {
//       // error out
//       return res.status(400).json({ success: false, message: 'Not found email' });
//     }
//     // check that password is got for user
//     if (!(await user.checkPassword(password))) {
//       // error out
//       return res.status(400).json({ success: false, message: 'Not match email/password' });
//     }

//     if (registrationToken) {
//       const tokens = user.registrationTokens;
//       user.registrationTokens = _.union([registrationToken], tokens);
//       await user.save();
//     }

//     // return the user
//     return res.json({
//       user: user.toJSON(),
//       success: true,
//       token: await user.getJWT(),
//     });
//   } catch (e) {
//     // send errors
//     return res.status(500).json({ success: false, message: e });
//   }
// });

/**
 * POST: Register a user `/user`
 */
app.post(
  '/',
  withAuthAdmin,
  requires({ body: ['fullName', 'userName', 'password', 'type', 'phoneNumber', 'company'] }),
  validateString('fullName'),
  validateString('userName'),
  validatePassword('password'),
  validateUserType('type'),

  async (req, res) => {
    try {
      // get this piece of info
      const { fullName, userName, password, type, phoneNumber, company } = req.body;
      // get errors
      const errors = validationResult(req);
      // check for errors
      if (!errors.isEmpty()) {
        // send errors
        return res.status(422).json({ errors: errors.array() });
      }
      // find the user and don't return the isAdmin flag
      const existUser = (await UserModel.findOne({ userName, deleted: false })) as InstanceType<
        User
      >;
      // sanity check for existing user
      if (existUser) {
        // send errors
        return res.status(400).json({ success: false, message: 'User Name is in use' });
      }
      const userProperties = {
        fullName,
        userName,
        password,
        type,
        phoneNumber,
        company,
      };
      const user = new UserModel(userProperties);
      // generate hash from password
      await user.generateHash(password);
      // save new user
      await user.save();
      // return success
      return res.json({
        user,
        success: true,
        token: await user.getJWT(),
        message: 'User created',
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e });
    }
  },
);

/**
 * PATCH: Update a user `/user/:id`
 */
// app.patch(
//   '/:id',
//   withAuth,
//   requires({ params: ['id'], body: ['fullName', 'email', 'phoneNumber'] }),
//   validateString('fullName'),
//   validateString('email'),
//   validateEmail('phoneNumber'),
//   async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { fullName, email, photo, password, phoneNumber } = req.body;
//       // if password
//       let newValue = {
//         fullName,
//         email,
//         phoneNumber,
//       };
//       // check if photo
//       if (photo) {
//         newValue = Object.assign(newValue, { photo });
//       }
//       const user = await UserModel.findByIdAndUpdate({ _id: id }, newValue, { new: true });
//       if (!user) {
//         return res.status(400).json({ success: false, message: 'User not found' });
//       }
//       if (password) {
//         await user.generateHash(password);
//       }
//       await user.save();
//       return res.json({
//         user,
//         success: true,
//         message: 'Update successful!',
//       });
//     } catch (e) {
//       // send errors
//       return res.status(500).json({ success: false, message: e });
//     }
//   },
// );

// /**
//  * DELETE: Remove a user `/user/:id`
//  */
// app.delete('/:id', withAuth, requires({ params: ['id'] }), async (req, res) => {
//   const { id } = req.params;
//   try {
//     // try deleting
//     const userDeleted = await UserModel.findOne({ _id: id, deleted: false });
//     // sanity check for user deleted
//     if (!userDeleted) return res.status(400).json({ success: false, message: 'User not found' });
//     // respond if success
//     // soft delete this user
//     const myQuery = { _id: id };
//     const newValue = { $set: { deleted: true } };
//     await UserModel.updateOne(myQuery, newValue, err => {
//       if (err) {
//         return res.json({
//           success: false,
//           message: "Can't delete",
//         });
//       }
//       return res.json({
//         success: true,
//         message: 'User deleted',
//       });
//     });
//   } catch (e) {
//     // send errors
//     return res.status(500).json({ success: false, message: e });
//   }
// });

/**
 * POST: Register a user as Admin `/user/admin`
 */
// app.post(
//     '/admin',
//     requires({ body: ['fullName', 'userName', 'password', 'phoneNumber'] }),
//     validateString('fullName'),
//     validateString('userName'),
//     validatePassword('password'),

//     async (req, res) => {
//         try {
//             // get this piece of info
//             const { fullName, userName, password, phoneNumber } = req.body;
//             // get errors
//             const errors = validationResult(req);
//             // check for errors
//             if (!errors.isEmpty()) {
//                 // send errors
//                 return res.status(422).json({ errors: errors.array() });
//             }
//             // find the admin user
//             const existUser = (await UserModel.findOne({ type: UserType.ADMIN, deleted: false })) as InstanceType<User>;
//             // sanity check for existing user
//             if (existUser) {
//                 // send errors
//                 return res.status(400).json({ success: false, message: 'Admin already registered!' });
//             }
//             const userProperties = {
//                 fullName,
//                 userName,
//                 password,
//                 type: UserType.ADMIN,
//                 phoneNumber
//             };
//             const user = new UserModel(userProperties);
//             // generate hash from password
//             await user.generateHash(password);
//             // save new user
//             await user.save();
//             // return success
//             return res.json({
//                 user,
//                 success: true,
//                 token: await user.getJWT(),
//                 message: 'Admin reigisterd!',
//             });
//         } catch (e) {
//             return res.status(500).json({ success: false, message: e });
//         }
//     },
// );

export default app;
