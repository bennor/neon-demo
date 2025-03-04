import postgres from 'postgres';
import { timeAgo } from '@/lib/utils';
import Image from 'next/image';
import RefreshButton from './refresh-button';
import { seed } from '@/lib/seed';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('custom-tracer');

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export default async function Table() {
  let data;
  let startTime = Date.now();

  let loadSpan = tracer.startSpan('load-profiles');
  try {
    data = await sql`SELECT * FROM profiles`;
    loadSpan.end();
  } catch (e: any) {
    loadSpan.end();
    if (e.message.includes('relation "profiles" does not exist')) {
      console.log(
        'Table does not exist, creating and seeding it with dummy data now...'
      );
      // Table is not created yet
      const seedSpan = tracer.startSpan('seed-profiles');
      await seed();
      seedSpan.end();
      startTime = Date.now();
      loadSpan = tracer.startSpan('load-profiles');
      data = await sql`SELECT * FROM profiles`;
    } else {
      throw e;
    }
  } finally {
    loadSpan.end();
  }

  const profiles = data;
  const duration = Date.now() - startTime;

  return (
    <div className="bg-white/30 p-12 shadow-xl ring-1 ring-gray-900/5 rounded-lg backdrop-blur-lg max-w-xl mx-auto w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Recent Users</h2>
          <p className="text-sm text-gray-500">
            Fetched {profiles.length} users in {duration}ms
          </p>
        </div>
        <RefreshButton />
      </div>
      <div className="divide-y divide-gray-900/5">
        {profiles.map((user) => (
          <div
            key={user.name}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center space-x-4">
              <Image
                src={user.image}
                alt={user.name}
                width={48}
                height={48}
                className="rounded-full ring-1 ring-gray-900/5"
              />
              <div className="space-y-1">
                <p className="font-medium leading-none">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">{timeAgo(user.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
