ALTER TABLE `songs` ADD `visibility` enum('private','public') DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `publishedAt` timestamp;