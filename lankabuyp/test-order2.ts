import { db } from './src/lib/firebase.ts';
import { doc, getDoc } from 'firebase/firestore';

async function test() {
  const snap = await getDoc(doc(db, 'orders', 'ORD-660809-265'));
  console.log(JSON.stringify(snap.data(), null, 2));
  process.exit(0);
}
test().catch(console.error);
