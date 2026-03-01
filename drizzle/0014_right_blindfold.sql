CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('song_ready','song_favorited','song_shared','credit_added','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`songId` int,
	`actorName` varchar(255),
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
