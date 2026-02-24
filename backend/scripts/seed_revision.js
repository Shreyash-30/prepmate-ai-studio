import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { TopicMastery, RevisionSchedule } from '../src/models/MLIntelligence.js';

async function seed() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log(`Found ${users.length} users`);

    const topicsToSeed = [
        { topicId: 'arrays', mastery: 0.75, retention: 0.4, urgency: 'high' },
        { topicId: 'strings', mastery: 0.6, retention: 0.3, urgency: 'critical' },
        { topicId: 'dynamic_programming', mastery: 0.45, retention: 0.6, urgency: 'medium' }
    ];

    for (const user of users) {
        const userId = user._id.toString();
        console.log(`Seeding for user: ${user.email} (${userId})`);

        for (const topic of topicsToSeed) {
            // Upsert TopicMastery
            await TopicMastery.findOneAndUpdate(
                { userId, topicId: topic.topicId },
                {
                    mastery_probability: topic.mastery,
                    confidence_score: 0.85,
                    improvement_trend: 'stable',
                    attempts_count: 12,
                    last_attempt_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
                    recommended_difficulty: topic.mastery > 0.7 ? 'medium' : 'easy'
                },
                { upsert: true, new: true }
            );

            // Upsert RevisionSchedule
            await RevisionSchedule.findOneAndUpdate(
                { userId, topicId: topic.topicId },
                {
                    retention_probability: topic.retention,
                    stability_score: 2.5,
                    next_revision_date: new Date(),
                    days_until_revision: 0,
                    urgency_level: topic.urgency,
                    last_successful_revision: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
                },
                { upsert: true, new: true }
            );
        }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
