import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /* ----- CREATE ----- */
  async create(dto: CreateUserDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const user = new this.userModel({
        email: dto.email,
        passwordHash: hash,
      });
      return (await user.save()).toJSON(); // hash stripped in toJSON
    } catch (err) {
      if (err.code === 11000) {
        // Mongo duplicate key
        throw new BadRequestException('Email already exists');
      }
      throw err;
    }
  }

  /* ----- READ ALL ----- */
  async findAll() {
    return this.userModel.find().select('-passwordHash').lean();
  }

  /* ----- READ ONE ----- */
  async findOne(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-passwordHash')
      .lean();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /* ----- UPDATE ----- */
  async update(id: string, dto: UpdateUserDto) {
    const updateData: Partial<User> = {};

    if (dto.email) updateData.email = dto.email;
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-passwordHash')
      .lean();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /* ----- DELETE ----- */
  async remove(id: string) {
    const res = await this.userModel.findByIdAndDelete(id).lean();
    if (!res) throw new NotFoundException('User not found');
    return { deleted: true };
  }
}
