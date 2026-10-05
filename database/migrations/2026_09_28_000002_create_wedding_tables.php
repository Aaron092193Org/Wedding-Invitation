<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. WeddingSettings
        Schema::create('WeddingSettings', function (Blueprint $table) {
            $table->increments('Id');
            $table->string('Key', 100)->unique();
            $table->text('Value');
            $table->string('Category', 50)->default('General');
            $table->string('Description', 255)->nullable();
            $table->dateTime('UpdatedDate')->useCurrent();
        });

        // 2. Guests
        Schema::create('Guests', function (Blueprint $table) {
            $table->increments('GuestId');
            $table->string('FullName', 150);
            $table->string('Email', 150)->nullable();
            $table->string('MobileNumber', 50)->nullable();
            $table->integer('AllowedGuests')->default(1);
            $table->string('InvitationCode', 30)->unique();
            $table->string('RsvpStatus', 30)->default('Pending');
            $table->string('Notes', 500)->nullable();
            $table->dateTime('CreatedAt')->useCurrent();
            $table->dateTime('UpdatedAt')->nullable();
        });

        // 3. RSVPs
        Schema::create('RSVPs', function (Blueprint $table) {
            $table->increments('RSVPId');
            $table->unsignedInteger('GuestId')->nullable();
            $table->string('FullName', 150);
            $table->string('Email', 150);
            $table->string('MobileNumber', 50);
            $table->string('AttendanceStatus', 30)->default('Attending');
            $table->integer('NumberOfGuests')->default(1);
            $table->string('MealPreference', 100)->nullable();
            $table->string('DietaryRestrictions', 500)->nullable();
            $table->string('Message', 1000)->nullable();
            $table->dateTime('SubmittedDate')->useCurrent();
            $table->dateTime('UpdatedDate')->nullable();
            $table->string('IPAddress', 50)->nullable();

            $table->foreign('GuestId')->references('GuestId')->on('Guests')->onDelete('set null');
        });

        // 4. RSVPGuests
        Schema::create('RSVPGuests', function (Blueprint $table) {
            $table->increments('Id');
            $table->unsignedInteger('RsvpId');
            $table->string('GuestName', 150);
            $table->string('MealPreference', 100)->nullable();
            $table->string('DietaryRestrictions', 500)->nullable();

            $table->foreign('RsvpId')->references('RSVPId')->on('RSVPs')->onDelete('cascade');
        });

        // 5. Entourage
        Schema::create('Entourage', function (Blueprint $table) {
            $table->increments('Id');
            $table->string('Category', 100);
            $table->string('Name', 150);
            $table->string('Role', 100)->nullable();
            $table->integer('DisplayOrder')->default(0);
        });

        // 6. Timeline
        Schema::create('Timeline', function (Blueprint $table) {
            $table->increments('Id');
            $table->string('Time', 50);
            $table->string('Title', 150);
            $table->string('Description', 500)->nullable();
            $table->string('Icon', 50)->default('heart');
            $table->integer('DisplayOrder')->default(0);
        });

        // 7. Gallery
        Schema::create('Gallery', function (Blueprint $table) {
            $table->increments('Id');
            $table->string('ImageUrl', 500);
            $table->string('ThumbnailUrl', 500)->nullable();
            $table->string('Caption', 255)->nullable();
            $table->string('Category', 50)->nullable();
            $table->integer('DisplayOrder')->default(0);
            $table->boolean('IsActive')->default(true);
            $table->dateTime('CreatedDate')->useCurrent();
        });

        // 8. FAQs
        Schema::create('FAQs', function (Blueprint $table) {
            $table->increments('Id');
            $table->string('Question', 255);
            $table->text('Answer');
            $table->integer('DisplayOrder')->default(0);
            $table->boolean('IsActive')->default(true);
        });

        // 9. GiftInformation
        Schema::create('GiftInformation', function (Blueprint $table) {
            $table->increments('Id');
            $table->string('PaymentType', 50);
            $table->string('AccountName', 150);
            $table->string('AccountNumber', 100);
            $table->string('QrCodeUrl', 500)->nullable();
            $table->string('Instructions', 500)->nullable();
            $table->integer('DisplayOrder')->default(0);
            $table->boolean('IsEnabled')->default(true);
        });

        // 10. AdminUsers
        Schema::create('AdminUsers', function (Blueprint $table) {
            $table->increments('Id');
            $table->string('Username', 50)->unique();
            $table->string('Email', 150);
            $table->string('PasswordHash', 255);
            $table->string('FullName', 150);
            $table->dateTime('CreatedAt')->useCurrent();
            $table->dateTime('LastLogin')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('AdminUsers');
        Schema::dropIfExists('GiftInformation');
        Schema::dropIfExists('FAQs');
        Schema::dropIfExists('Gallery');
        Schema::dropIfExists('Timeline');
        Schema::dropIfExists('Entourage');
        Schema::dropIfExists('RSVPGuests');
        Schema::dropIfExists('RSVPs');
        Schema::dropIfExists('Guests');
        Schema::dropIfExists('WeddingSettings');
    }
};
