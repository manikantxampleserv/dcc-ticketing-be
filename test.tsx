import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PaginationParams {
  model: any; // Prisma model instance
  filters?: any;
  page?: number;
  limit?: number;
  select?: any;
  include?: any;
  orderBy?: any;
}

export async function paginate<T>({
  model,
  filters = {},
  page = 1,
  limit = 10,
  select,
  include,
  orderBy = { id: "desc" },
}: PaginationParams): Promise<{
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    has_previous: boolean;
  };
}> {
  const skip = (page - 1) * limit;

  const total_count = await model.count({ where: filters });

  const data = await model.findMany({
    where: filters,
    skip,
    take: limit,
    select,
    include,
    orderBy,
  });

  return {
    data,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(total_count / limit),
      total_count,
      has_next: page * limit < total_count,
      has_previous: page > 1,
    },
  };
}
