import 'dotenv/config';
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { Business } from '../../entities/business.entity';
import { User } from '../../entities/user.entity';
import { ContractTemplate } from '../../entities/contract-template.entity';
import { Role } from '../../common/enums/role.enum';
import { hashValue } from '../../common/utils/hash.util';

async function seed(ds: DataSource): Promise<void> {
  const businessRepo = ds.getRepository(Business);
  const userRepo = ds.getRepository(User);
  const templateRepo = ds.getRepository(ContractTemplate);

  let business = await businessRepo.findOne({ where: { slug: 'acme-inc' } });
  if (!business) {
    business = await businessRepo.save(
      businessRepo.create({
        name: 'Acme Inc',
        slug: 'acme-inc',
      }),
    );
  }

  const ownerEmail = 'owner@acme.local';
  let owner = await userRepo.findOne({
    where: { businessId: business.id, email: ownerEmail },
  });
  if (!owner) {
    owner = await userRepo.save(
      userRepo.create({
        businessId: business.id,
        email: ownerEmail,
        fullName: 'Acme Owner',
        passwordHash: await hashValue('StrongPass!123'),
        role: Role.BUSINESS_OWNER,
        isActive: true,
      }),
    );
  }

  const templateName = 'Master Service Agreement';
  const template = await templateRepo.findOne({
    where: { businessId: business.id, name: templateName },
  });
  if (!template) {
    await templateRepo.save(
      templateRepo.create({
        businessId: business.id,
        name: templateName,
        body: 'This Master Service Agreement is between {{client_name}} and {{business_name}} for {{amount}} {{currency}}.',
        version: 1,
        isActive: true,
      }),
    );
  }

  console.log('Seed complete');
  console.log('Owner email:', ownerEmail);
  console.log('Owner password:', 'StrongPass!123');
}

void dataSource
  .initialize()
  .then(async (ds) => {
    await seed(ds);
    await ds.destroy();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
