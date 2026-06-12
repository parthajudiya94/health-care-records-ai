-- AlterTable
ALTER TABLE `recordfile` ADD COLUMN `reportType` VARCHAR(191) NULL,
    ADD COLUMN `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NULL;

-- AlterTable
ALTER TABLE `reminder` ADD COLUMN `recurring` ENUM('NONE', 'DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'NONE',
    MODIFY `type` ENUM('APPOINTMENT', 'MEDICATION', 'TEST', 'OTHER') NOT NULL;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Notification_userId_readAt_idx`(`userId`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
