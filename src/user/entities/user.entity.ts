import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/* ---------- Sub-document for Spotify tokens ---------- */

@Schema({ _id: false })
export class SpotifyCreds {
  @Prop() accessToken?: string;
  @Prop() refreshToken?: string;
  @Prop() expiresAt?: Date;
}
export const SpotifyCredsSchema = SchemaFactory.createForClass(SpotifyCreds);

/* ---------- User document ---------- */

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  /* optional – present only after user connects Spotify */
  @Prop({ type: SpotifyCredsSchema }) // add default:{} if you prefer an empty object
  spotify?: SpotifyCreds;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

/* Strip passwordHash when converting to JSON (keeps API responses clean) */
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};
