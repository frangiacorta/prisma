import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const sessions=sqliteTable('director_sessions',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),expires:integer('expires').notNull(),
 attempts:integer('attempts').notNull().default(0),limit:integer('limit_count').notNull(),
 lease:integer('lease').notNull().default(0),stopped:integer('stopped').notNull().default(0),
 input:integer('input_tokens').notNull().default(0),output:integer('output_tokens').notNull().default(0),
 memory:text('memory').notNull().default(''),history:text('history').notNull().default('[]'),
});
export const days=sqliteTable('director_days',{
 owner:text('owner').notNull(),day:text('day').notNull(),attempts:integer('attempts').notNull().default(0),lease:integer('lease').notNull().default(0),leaseOwner:text('lease_owner').notNull().default(''),
},t=>[primaryKey({columns:[t.owner,t.day]})]);
