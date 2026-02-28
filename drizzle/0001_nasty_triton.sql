CREATE TABLE `album_songs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`albumId` int NOT NULL,
	`songId` int NOT NULL,
	`trackOrder` int NOT NULL DEFAULT 0,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `album_songs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `albums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`coverColor` varchar(20) DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `albums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`keywords` varchar(500) NOT NULL,
	`abcNotation` text NOT NULL,
	`musicDescription` text,
	`mp3Url` text,
	`mp3Key` varchar(500),
	`duration` int DEFAULT 30,
	`tempo` int DEFAULT 120,
	`keySignature` varchar(20),
	`timeSignature` varchar(10),
	`genre` varchar(100),
	`mood` varchar(100),
	`instruments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `songs_id` PRIMARY KEY(`id`)
);
