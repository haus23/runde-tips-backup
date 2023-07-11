import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  getFirestore,
  type FirestoreDataConverter,
  type PartialWithFieldValue,
  type DocumentData,
} from 'firebase-admin/firestore';

const firebaseSvcAccount = {
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const apps = getApps();

const app =
  apps.length > 0
    ? apps[0]
    : initializeApp({
        credential: cert({
          ...firebaseSvcAccount,
        }),
      });

const db = getFirestore(app);

const modelConverter = <
  T extends { id: string }
>(): FirestoreDataConverter<T> => ({
  toFirestore: (modelObject: PartialWithFieldValue<T>): DocumentData => {
    const { id, ...doc } = modelObject;
    return doc;
  },
  fromFirestore: (snapshot) =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
    } as T),
});

export { db, modelConverter };
