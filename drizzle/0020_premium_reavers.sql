CREATE TABLE `admin_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationType` enum('subscription_new','payment_failed','subscription_canceled') NOT NULL,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`pushEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_notification_preferences_id` PRIMARY KEY(`id`)
);
